// TODO: compare with official docs
// import * as functions from 'firebase-functions'
const functions = require('firebase-functions')

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

const datejs = require('./Datejs/core')
const {
      dialogflow,
      SimpleResponse,
      Table,
      Image,
      Button
} = require('actions-on-google')
const app = dialogflow({ debug: true })

app.intent('Default Welcome Intent', (conv) => {
      var now = Date()
      var day = now.split(' ')[0].toLowerCase()

      var timetable = getTimetable(day)

      conv.close(new SimpleResponse({
            text: "Today's time table is",
            speech: `You have the these classes on ${timetable.day}`
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
})

function getRows(timetable) {
      var rowElements
      
      // by format specified in https://developers.google.com/actions/assistant/responses#table_cards
      timetable.periods.forEach((period, hourIndex) => {
            rowElements.push({
                  cells: [period, timetable.periodTimes[hourIndex]],
                  dividerAfter: false
            })
      })

      // Break hours indication by adding rulers
      rowElements[1].dividerAfter = true
      rowElements[3].dividerAfter = true

      return rowElements
}

function getTimetable(day) {
      var timetable = {
            periodTimes: ["9:00 to 9:55", "9:55 to 10:50", "11:05 to 12:00", "12:00 to 12:55", "1:45 to 2:40", "2:40 to 3:30"]
      }

      switch (day) {
            case "Mon":
                  timetable = {
                        day: "Monday",
                        periods: ["Math", "Data Structures"]
                  }
                  break
      
            case "Tue":
                  timetable = {
                        day: "Tuesday",
                        periods: ["Natural language processing", "Database Management"]
                  }
                  break
            
            case "Wed":
                  timetable = {
                        day: "Wednesday",
                        periods: ["Math", "Image Processing"]
                  }
                  break

            case "Thu":
                  timetable = {
                        day: "Thrurday",
                        periods: ["Data Structures", "FAFL"]
                  }
                  break

            case "Fri":
                  timetable = {
                        day: "Friday",
                        periods: ["Math", ""]
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