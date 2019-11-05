'use strict'
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
      if (typeof payload === 'undefined') {
            return conv.ask(new SignIn('To get your Timetable'))
      } else {
            return new Promise((resolve, reject) => respondWithTimetable(conv, resolve))
      }
})

function respondWithTimetable(conv, resolve) {
      const periodTimes = ["9:00 to 9:55", "9:55 to 10:50", "11:05 to 12:00", "12:00 to 12:55", "1:45 to 2:40", "2:40 to 3:35", "3:35 to 4:30"]
      const payload = conv.user.profile.payload

      db.collection('users').doc(payload.sub).get()
            .then((userDocSnapshot) => {
                  return db.collection('timetables').doc(userDocSnapshot.data().class).get()
            })
            .then((timetableDocSnapshot) => {
                  sendResponse(timetableDocSnapshot.data(), conv)
                  console.log('TAG exit send Response')
                  resolve()
                  console.log('TAG resolved')
                  return null
            })
            .catch((err) => {
                  throw err
            })

      function sendResponse(docData, conv) {
            let currentIndiaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
            let day = new Date(currentIndiaTime).toString().split(' ')[0].toLowerCase()

            console.log(`TAG ${docData}`)  // docdata[day] must contain timetable and day in full form

            var timetable, fullDay
            switch (day) {
                  case "mon": timetable = docData.mon.timetable
                        fullDay = docData.mon.day
                        break
                  case "tue": timetable = docData.tue.timetable
                        fullDay = docData.tue.day
                        break
                  case "wed": timetable = docData.wed.timetable
                        fullDay = docData.wed.day
                        break
                  case "thu": timetable = docData.thu.timetable
                        fullDay = docData.thu.day
                        break
                  case "fri": timetable = docData.fri.timetable
                        fullDay = docData.fri.day
                        break
                  case "sat": timetable = docData.sat.timetable
                        fullDay = docData.thu.day  // testing onlyyyyy
                        break
                  case "sun": timetable = docData.sun.timetable
                        fullDay = docData.sun.day
                        break
                  default:
                        console.log('default')
                        timetable = docData.mon.timetable
                        fullDay = docData.mon.day
            }

            conv.close(new SimpleResponse({
                  text: "Today's time table is",
                  speech: "test speech, update getSpeech()"  // getSpeech(timetable, currentIndiaTime)
            }))
            return conv.close(new Table({
                  title: `${fullDay}'s classes`,
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
            // return conv.close(new Suggestions(['Change Class'], ['Send Feedback']))

            function getRows(timetable) {
                  var rowElements = []

                  // by format specified in https://developers.google.com/actions/assistant/responses#table_cards
                  timetable.forEach((period, hourIndex) => {
                        rowElements.push({
                              cells: [period, periodTimes[hourIndex]],
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

app.intent('ask_for_sign_in_confirmation', (conv, params, signin) => {
      if (signin.status !== 'OK') {
            return conv.close("Please try again")
      }
      conv.data.payload = conv.user.profile.payload
      conv.data.userData = {}

      conv.ask(`Great! Thanks for signing in, to complete the first-time set up process, please tell us your branch`)
      return conv.ask(new Suggestions(['IS', 'CS', 'EC', 'EE', 'ME', 'TC', 'EI', 'IEM']))
})

app.intent('branch', (conv, { branch }) => {
      // do google sign in at the end
      conv.data.userData.branch = branch

      conv.ask(`Now, select your semester`)
      return conv.ask(new Suggestions(["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"]))
})

app.intent('semester', (conv, { ordinal }) => {
      conv.data.userData.semester = ordinal

      conv.ask(`Now, select your class`)
      return conv.ask(new Suggestions(["A section", "B section", "C section", "D section", "E section"]))
})

app.intent('section', (conv, { any }) => {
      conv.data.userData.section = any

      return new Promise((resolve, reject) => {
            db.collection('users').doc(conv.data.payload.sub).set(
                  {
                        "branch": conv.data.userData.branch,
                        "semester": conv.data.userData.semester,
                        "id": conv.data.payload.sub,
                        "class": `${conv.data.userData.branch} ${conv.data.userData.semester} ${conv.data.userData.section}`,
                        "payload": conv.data.payload
                  }
            )
                  .then(() => {
                        conv.ask(`You're all set up!, Here's today's timetable, Invoke this action by saying "Talk to today's timetable"`)
                        return respondWithTimetable(conv, resolve)
                  })
                  .catch((err) => {
                        throw err
                  })
      })  // had to return a promise!
})

exports.fulfillmentUS = functions.https.onRequest(app)  // change to us-central1 (location of db) !!!! sign in errors cause of thisss
exports.fulfillmentHKG = functions
      .region('asia-east2').https.onRequest(app)
// get class from suggestion chips

// o/p from suggestion chip is intent text