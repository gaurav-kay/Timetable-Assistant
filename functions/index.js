// TODO: compare with official docs
// import * as functions from 'firebase-functions'
const functions = require('firebase-functions')

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

// const datejs = require('./Datejs/core')
const {
      dialogflow,
      SimpleResponse,
      Table,
      Image,
      Button
} = require('actions-on-google')
const app = dialogflow({ debug: true })

app.intent('Default Welcome Intent', (conv) => {
      var hongKong = new Date()
      var currentIndiaTime = hongKong
      currentIndiaTime.setHours(hongKong.getHours() - 2, hongKong.getMinutes() - 30)
      currentIndiaTime = currentIndiaTime.toString()
      var day = currentIndiaTime.split(' ')[0].toLowerCase()

      var holidayStatus = checkHoliday(currentIndiaTime)
      if(!holidayStatus.isHoliday) {
            var timetable = getTimetable(day)

            conv.close(new SimpleResponse({
                  text: "Today's time table is",
                  // speech: `You have these classes on ${timetable.day}`
                  speech: getSpeech(timetable, currentIndiaTime)
                  // TODO text/speech should tell books to be swapped
            }))
            conv.close(new Table({
                  title: `${timetable.day}'s classes`,
                  subtitle: `Classes you have today`,
                  image: new Image({
                        url: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5a/Ramaiah_Institutions_Logo.png/220px-Ramaiah_Institutions_Logo.png',
                        alt: 'Test alt text and image'
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
                  buttons: new Button({
                        // TODO: add section changing option
                        title: 'Change section',
                        url: 'https://www.google.com' // test url
                  })
            }))
      }
      else {
            conv.ask(new SimpleResponse({
                  text: `Today is holiday due to ${holidayStatus.reason}, Want to know tomorrow's timetable?`,
                  speech: "You don't have classes today"
            }))
      }
})

function getSpeech(todayTimetable, todayDate) {
      var x = new Date(todayDate)
      var prevDate = new Date(x)
      prevDate.setDate(x.getDate() - 1)
      
      var prevTimetable = getTimetable(prevDate.toString().split(' ')[0].toLowerCase())

      // https://stackoverflow.com/questions/1723168/what-is-the-fastest-or-most-elegant-way-to-compute-a-set-difference-using-javasc
      var removeBooks = prevTimetable.periods.filter(period => !todayTimetable.periods.includes(period))
      var addBooks = todayTimetable.periods.filter(period => !prevTimetable.periods.includes(period))

      if(removeBooks.length === 0) {
            return `Add ${addBooks.join(", ")}`
      } else if(addBooks.length === 0) {
            return `Remove ${removeBooks.join(", ")}`
      } else {
            return `Remove ${removeBooks.join(", ")} and add ${addBooks.join(", ")}`
      }
}

function checkHoliday(time) {
      if(time.split(' ')[0].toLowerCase() === 'sat' || time.split(' ')[0].toLowerCase() === 'sun') {
            return {
                  isHoliday: true,
                  reason: "Weekend"
            }
      } else {
            // TODO: Check public holidays
            return {
                  isHoliday: false,
                  reason: ""
            }
      }
}

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
     
      if(rowElements.length >= 1 && rowElements.length < 4) {
            rowElements[1].dividerAfter = true
      } else if (rowElements.length >= 4) {
            rowElements[1].dividerAfter = true
            rowElements[3].dividerAfter = true
      }

      return rowElements
}

function getTimetable(day) {
      var timetable = new Object()
      timetable["periodTimes"] = ["9:00 to 9:55", "9:55 to 10:50", "11:05 to 12:00", "12:00 to 12:55", "1:45 to 2:40", "2:40 to 3:35", "3:35 to 4:30"]

      switch (day) {
            case "mon":
                  timetable = {
                        periodTimes: ["9:00 to 9:55", "9:55 to 10:50", "11:05 to 12:00", "12:00 to 12:55", "1:45 to 2:40", "2:40 to 3:35", "3:35 to 4:30"],
                        day: "Monday",
                        periods: ["Math", "Data Structures", "Natural Language Processing", "Database Management", "Image Processing"]
                  }
                  break
      
            case "tue":
                  timetable = {
                        periodTimes: ["9:00 to 9:55", "9:55 to 10:50", "11:05 to 12:00", "12:00 to 12:55", "1:45 to 2:40", "2:40 to 3:35", "3:35 to 4:30"],
                        day: "Tuesday",
                        periods: ["Natural language processing", "Database Management", "Math", "Data Structures", "DAA Lab", "DAA Lab"]
                  }
                  break
            
            case "wed":
                  timetable = {
                        periodTimes: ["9:00 to 9:55", "9:55 to 10:50", "11:05 to 12:00", "12:00 to 12:55", "1:45 to 2:40", "2:40 to 3:35", "3:35 to 4:30"],
                        day: "Wednesday",
                        periods: ["Math", "Image Processing", "Data Structures", "FAFL", "Natural language processing", "Database Management", "Math"]
                  }
                  break

            case "thu":
                  timetable = {
                        periodTimes: ["9:00 to 9:55", "9:55 to 10:50", "11:05 to 12:00", "12:00 to 12:55", "1:45 to 2:40", "2:40 to 3:35", "3:35 to 4:30"],
                        day: "Thrurday",
                        periods: ["Data Structures", "FAFL"]
                  }
                  break

            case "fri":
                  timetable = {
                        periodTimes: ["9:00 to 9:55", "9:55 to 10:50", "11:05 to 12:00", "12:00 to 12:55", "1:45 to 2:40", "2:40 to 3:35", "3:35 to 4:30"],
                        day: "Friday",
                        periods: ["Math", "Haha fml"]
                  }
                  break

            default:
                  break
      }
      // TODO: Return timetable based on holidays etc
      return timetable
}

exports.fulfillmentHKG = functions
                        .region('asia-east2')
                        .https.onRequest(app)