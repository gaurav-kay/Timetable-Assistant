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
      Carousel,
      Image
} = require('actions-on-google')
const app = dialogflow({ debug: true })

app.intent('Default Welcome Intent', (conv) => {
      var now = Date()
      var data = now

      var timetable = getTimetable()

      conv.close(new SimpleResponse({
            text: `Hello, today's date is ${data}`,
            speech: `Date is ${data}` 
      }))

})

function getTimetable(date) {
      var timetable
      var now = Date()
      var day = now.split(' ')[0].toLowerCase()
      switch (day) {
            case "Mon":
                  timetable = {
                        "day": "Monday",
                        "period1": "Monday Math",
                        "period2": "Monday Data Structures"
                  }
                  break
      
            case "Tue":
                  timetable = {
                        "day": "Tuesday",
                        "period1": "Tuesday Math",
                        "period2": "Tuesday Data Structures"
                  }
                  break
            
            case "Wed":
                  timetable = {
                        "day": "Wednesday",
                        "period1": "Wednesday Math",
                        "period2": "Wednesday Data Structures"
                  }
                  break

            case "Thu":
                  timetable = {
                        "day": "Thrurday",
                        "period1": "Thrurday Math",
                        "period2": "Thrurday Data Structures"
                  }
                  break

            case "Fri":
                  timetable = {
                        "day": "Friday",
                        "period1": "Friday Math",
                        "period2": "Friday Data Structures"
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