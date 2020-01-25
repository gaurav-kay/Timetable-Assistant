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

const firebaseConfig = config.firebaseConfig
firebase.initializeApp(firebaseConfig)
admin.initializeApp(functions.config().firebase)
var db = admin.firestore()

const app = dialogflow({
      debug: true,
      clientId: config.clientId
})

const branches = ['IS']
const semesters = ["2nd", "4th", "6th"]
const sections = ["A section", "B section", "C section"]
const firstYearSections = ["A section", "B section", "C section", "D section", "E section", "F section", "G section"]


app.intent('Default Welcome Intent', (conv) => {
      const payload = conv.user.profile.payload

      if (typeof payload === 'undefined') {
            conv.ask('Welcome, Since this is your first time, Please complete this 1 time sign in and setup')

            conv.data.userData = {}
            conv.ask('Select your branch')

            return conv.ask(new Suggestions(branches))
      } else {
            return new Promise((resolve, reject) => respondWithTimetable(conv, resolve))
      }
})

function respondWithTimetable(conv, resolve) {
      const payload = conv.user.profile.payload

      console.log("PAYLOAD", payload)

      db.collection('users').doc(payload.sub).get()
            .then((userDocSnapshot) => {
                  console.log("USER DOC DATA", userDocSnapshot.data())

                  return db.collection('timetables').doc(userDocSnapshot.data().class).get()
            })
            .then((timetableDocSnapshot) => {
                  console.log("TIMETABLE DOC DATA", timetableDocSnapshot.data())

                  sendResponse(timetableDocSnapshot.data(), conv)
                  resolve()
                  return null
            })
            .catch((err) => {
                  console.log("ERR FIRESTORE GET", err)

                  throw err
            })

      function sendResponse(docData, conv) {
            let currentIndiaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
            let day = new Date(currentIndiaTime).toString().split(' ')[0].toLowerCase()

            console.log("DAY", day)
            console.log(`TAG`, docData)  // docdata[day] must contain timetable and day in full form

            var timetable, fullDay, periodTimes, offset, holidayStatus = false
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            const defaultPeriodTimes = ["9:00 to 9:55", "9:55 to 10:50", "11:05 to 12:00", "12:00 to 12:55", "1:45 to 2:40", "2:40 to 3:35", "3:35 to 4:30", "After class", "After class"]
            switch (day) {
                  case "mon": timetable = docData.mon.timetable
                        periodTimes = "periodTimes" in docData.mon ? docData.mon.periodTimes : defaultPeriodTimes
                        fullDay = dayNames[new Date(currentIndiaTime).getDay()]
                        offset = "offset" in docData.mon ? Number(docData.mon.offset) : 0
                        break
                  case "tue": timetable = docData.tue.timetable
                        periodTimes = "periodTimes" in docData.tue ? docData.tue.periodTimes : defaultPeriodTimes
                        fullDay = dayNames[new Date(currentIndiaTime).getDay()]
                        offset = "offset" in docData.tue ? Number(docData.tue.offset) : 0
                        break
                  case "wed": timetable = docData.wed.timetable
                        periodTimes = "periodTimes" in docData.wed ? docData.wed.periodTimes : defaultPeriodTimes
                        fullDay = dayNames[new Date(currentIndiaTime).getDay()]
                        offset = "offset" in docData.wed ? Number(docData.wed.offset) : 0
                        break
                  case "thu": timetable = docData.thu.timetable
                        periodTimes = "periodTimes" in docData.thu ? docData.thu.periodTimes : defaultPeriodTimes
                        fullDay = dayNames[new Date(currentIndiaTime).getDay()]
                        offset = "offset" in docData.thu ? Number(docData.thu.offset) : 0
                        break
                  case "fri": timetable = docData.fri.timetable
                        periodTimes = "periodTimes" in docData.fri ? docData.fri.periodTimes : defaultPeriodTimes
                        fullDay = dayNames[new Date(currentIndiaTime).getDay()]
                        offset = "offset" in docData.fri ? Number(docData.fri.offset) : 0
                        break
                  case "sat": timetable = "sat" in docData ? docData.sat.timetable : docData.mon.timetable
                        if ("sat" in docData) {
                              periodTimes = docData.sat.periodTimes
                              offset = Number(docData.sat.offset)
                        } else {
                              periodTimes = defaultPeriodTimes
                              offset = 0
                        }
                        fullDay = "sat" in docData ? dayNames[new Date(currentIndiaTime).getDay()] : "Monday"
                        holidayStatus = "sat" in docData ? false : true
                        if (offset === 0) {
                              offset = "offset" in docData.mon ? Number(docData.mon.offset) : 0
                        }
                        break
                  case "sun": timetable = docData.mon.timetable
                        periodTimes = "periodTimes" in docData.mon ? docData.mon.periodTimes : defaultPeriodTimes
                        fullDay = "Monday"
                        holidayStatus = true
                        offset = "offset" in docData.mon ? Number(docData.mon.offset) : 0
                        break
                  default:
                        console.log('DEFAULT SWITCH', day)
                        timetable = docData.mon.timetable
                        periodTimes = defaultPeriodTimes
                        fullDay = "Monday"
                        offset = 0
            }

            console.log("SWITCH OP", timetable, periodTimes, fullDay, offset, holidayStatus)

            conv.ask(new SimpleResponse({
                  text: holidayStatus ? "No classes today, here's Monday's timetable" : "Today's time table is",
                  speech: holidayStatus ? "Here's Monday's timetable" : "Here's today's timetable"  // getSpeech(timetable, currentIndiaTime)
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
                  rows: getRows(timetable, periodTimes, offset),
            }))
            // return conv.close(new Suggestions(['Change Class'], ['Send Feedback']))

            function getRows(timetable, periodTimes, offset) {
                  // TODO: get period times from db too
                  var rowElements = []

                  // by format specified in https://developers.google.com/actions/assistant/responses#table_cards
                  timetable.forEach((period, hourIndex) => {
                        rowElements.push({
                              cells: [period, periodTimes[hourIndex + offset]],
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

                  console.log("ROW ELEMENTS", rowElements)
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

app.intent('branch', (conv, { branch }) => {
      conv.data.userData.branch = branch.toUpperCase()

      conv.ask(`Now, select your semester`)
      return conv.ask(new Suggestions(semesters))
})

app.intent('semester', (conv, { ordinal }) => {
      conv.data.userData.semester = ordinal.toUpperCase()

      conv.ask(`Now, select your class`)
      if (ordinal === 2 || ordinal === 1) {
            return conv.ask(new Suggestions(firstYearSections))
      }
      return conv.ask(new Suggestions(sections))
})

app.intent('section', (conv, { any }) => {
      conv.data.userData.section = any.toUpperCase()

      conv.ask('Thanks! Finally, Please Sign in to use College Timetable')
      return conv.ask(new SignIn('To use College Timetable'))
})

app.intent('ask_for_sign_in_confirmation', (conv, params, signin) => {
      if (signin.status !== 'OK') {
            return conv.close("Please try again")
      }
      conv.data.payload = conv.user.profile.payload

      return new Promise((resolve, reject) => {
            try {
                  console.log("USERDATA", conv.data.userData)
                  console.log("SUB AFTER SIGN IN", conv.user.profile.payload.sub)
            } catch (err) {
                  console.log("USERDATA ERR", err)
            }

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
                        console.log("WRITE SUCCESSFUL")

                        conv.ask(`Thanks for Signing In! You're all set up!, Here's today's timetable, Invoke this action by saying "Talk to College Timetable"`)
                        return respondWithTimetable(conv, resolve)
                  })
                  .catch((err) => {
                        throw err
                  })
      })  // had to return a promise!
})

exports.fulfillmentUS = functions.https.onRequest(app)  // change to us-central1 (location of db) !!!! sign in errors cause of thisss
exports.fulfillmentHKG = functions.region('asia-east2').https.onRequest(app)

// o/p from suggestion chip is intent text