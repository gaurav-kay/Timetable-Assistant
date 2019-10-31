const {
      dialogflow,
      SimpleResponse,
      Table,
      Image,
      SignIn,
      Suggestions
} = require('actions-on-google')
const admin = require('firebase-admin');
const functions = require('firebase-functions')
const firebase = require('firebase/app')
const config = require('./config')

const firebaseConfig = config.default.firebaseConfig
firebase.initializeApp(firebaseConfig)
admin.initializeApp(functions.config().firebase)
var db = admin.firestore()

const app = dialogflow({
      debug: true,
      clientId: config.default.clientId
})

app.intent('Default Welcome Intent', (conv) => {
      const payload = conv.user.profile.payload
      if (!payload.sub) {
            return conv.ask(new SignIn('To get your Timetable'))
      } else {
            respondWithTimetable(conv)
      }
})

function respondWithTimetable(conv) {
      const payload = conv.user.profile.payload

      db.collection('users').doc(payload.sub).get()
            .then((userDocSnapshot) => {
                  db.collection('timetables').doc(userDocSnapshot.data().class).get()
                        .then((timetableDocSnapshot) => {
                              sendResponse(timetableDocSnapshot.data())
                        })

            })


      function sendResponse(docData) {
            let hongKong = new Date()
            let currentIndiaTime = hongKong
            currentIndiaTime = currentIndiaTime.setHours(hongKong.getHours() - 2, hongKong.getMinutes() - 30).toString()
            let day = currentIndiaTime.split(' ')[0].toLowerCase()

            const timetable = docData[day].timetable  // docdata[day] must contain timetable and day in full form

            conv.close(new SimpleResponse({
                  text: "Today's time table is",
                  speech: getSpeech(timetable, currentIndiaTime)
            }))
            conv.close(new Table({
                  title: `${docData[day].day}'s classes`,
                  subtitle: `Classes you have today`,
                  image: new Image({
                        url: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5a/Ramaiah_Institutions_Logo.png/220px-Ramaiah_Institutions_Logo.png',
                        alt: 'Ramaiah Institute of Technology logo'
                  }),
                  columns: [
                        {
                              header: 'Subject',
                        },
                        {
                              header: 'Time'
                        }
                  ],
                  rows: getRows(timetable),
            }))
            conv.close(new Suggestions(['Change Class'], ['Send Feedback']))

            function getRows(timetable) {
                  var rowElements = []

                  // by format specified in https://developers.google.com/actions/assistant/responses#table_cards
                  timetable.periods.forEach((period, hourIndex) => {
                        rowElements.push({
                              cells: [period, timetable.periodTimes[hourIndex]],
                              dividerAfter: false
                        })
                  })

                  // Break hours indication by adding rulers
                  if (rowElements.length >= 1 && rowElements.length < 4) {
                        rowElements[1].dividerAfter = true
                  } else if (rowElements.length >= 4) {
                        rowElements[1].dividerAfter = true
                        rowElements[3].dividerAfter = true
                  }

                  return rowElements
            }
            // TODO: update getspeech
            function getSpeech(todayTimetable, todayDate) {
                  var x = new Date(todayDate)
                  var prevDate = (new Date(x)).setDate(x.getDate() - 1)

                  if (prevDate.toString().split(' ')[0].toLowerCase() === 'sun') {
                        prevDate.setDate(x.getDate() - 3)
                  }

                  var prevTimetable = getTimetable(prevDate.toString().split(' ')[0].toLowerCase())

                  // https://stackoverflow.com/questions/1723168/what-is-the-fastest-or-most-elegant-way-to-compute-a-set-difference-using-javasc
                  var removeBooks = prevTimetable.periods.filter(period => !todayTimetable.periods.includes(period))
                  var addBooks = todayTimetable.periods.filter(period => !prevTimetable.periods.includes(period))

                  if (removeBooks.length === 0) {
                        return `Add ${addBooks.join(", ")}`
                  } else if (addBooks.length === 0) {
                        return `Remove ${removeBooks.join(", ")}`
                  } else {
                        return `Remove ${removeBooks.join(", ")} and add ${addBooks.join(", ")}`
                  }
            }
      }
}

app.intent('Sign In Confirmation', (conv, params, signin) => {
      if (signin.status !== 'OK') {
            return conv.close("Please try again")
      }
      conv.data.payload = conv.user.profile.payload
      conv.data.userData = {}

      conv.ask(`Great! Thanks for signing in, to complete the first-time set up process, please tell us your branch`)
      return conv.ask(new Suggestions['IS', 'CS', 'EC', 'EE', 'ME', 'TC', 'EI', 'IEM', 'BT', 'CH', 'CV'])
})

app.intent('branch', (conv, { branch }) => {
      // do google sign in at the end
      conv.data.userData.branch = branch

      conv.ask(`Great, now select your semester`)
      return conv.ask(new Suggestions(["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"]))
})

app.intent('semester', (conv, { ordinal }) => {
      conv.data.userData.semester = ordinal

      conv.ask(`Now, select your class`)
      return conv.ask(new Suggestions(['A', 'B', 'C', 'D']))
})

app.intent('section', (conv, { letter }) => {
      conv.data.userData.section = letter

      db.collection('users').doc(conv.data.payload.sub).set(
            {
                  "branch": conv.data.userData.branch,
                  "semester": conv.data.userData.semester,
                  "id": conv.data.payload.sub,
                  "payload": conv.data.payload,
                  "class": `${conv.data.userData.semester} ${conv.data.userData.section}`
            }
      )
            .then(() => {
                  conv.ask(`You're all set up!, Here's today's timetable, Invoke this action by saying "Talk to today's timetable"`)
                  respondWithTimetable(conv)
            })
})

exports.fulfillmentHKG = functions
      .region('asia-east2')  // change to us-central1 (location of db)
      .https.onRequest(app)

// get class from suggestion chips

// o/p from suggestion chip is intent text