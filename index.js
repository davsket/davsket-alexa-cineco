const Alexa      = require('alexa-sdk')
const context    = require('aws-lambda-mock-context');
const _          = require('lodash')
const express    = require('express')
const alexa      = require('alexa-app')
const bodyParser = require('body-parser')
const cineco     = require('./cineco')
const PORT       = process.env.PORT || 5000

const app        = express()

const states = {
  DEFAULT                 : 'DEFAULT',
  LISTED_MOVIES           : 'LISTED_MOVIES',
  PROMPTED_TO_LIST_CINEMAS: 'PROMPTED_TO_LIST_CINEMAS',
  WHICH_CINEMA            : 'WHICH_CINEMA',
  LISTED_CINEMAS          : 'LISTED_CINEMAS'
}

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.post('/', function (req, res) {
    var ctx = context()
    handler(req.body, ctx)
    ctx.Promise
        .then(resp => {
          // console.log('resp', resp)
          return res.status(200).json(resp)
        })
        .catch(err => {  console.log(err); })
})

const handlers = {
  LaunchRequest: function () {
    console.log('Welcome to Cineco')
    this.attributes['state'] = state.DEFAULT
    this.emit(':ask', 'Welcome to Cineco, do you want to see what\'s on Unicentro?')
  },
  _getMoviesFor: function (cinema) {
    cineco
      .getMoviesFor(cinema)
      .then(movies => {
        this.attributes['movies'] = movies
        this.attributes['state'] = states.LISTED_MOVIES
        this.emit(':tell', `There are these movies for today on ${cinema}: 
          ${movies.map((m, i) => `${i}: ${m.title}`).join('\n')}.
          To check the functions say the index, or say "stop" to quit.`)
      }, err => {
        console.error(err)
        this.emit(':tell', 'Sorry, I couldn\'t contact to Cineco')
      })
  },
  YesIntent: function () {
    swich (this.attributes['state']) {
      case state.LISTED_MOVIES:
        this.attributes['state'] = state.WHICH_CINEMA
        return this.emit(':ask', `Which one?`)
      case state.PROMPTED_TO_LIST_CINEMAS:
        this.attributes['state'] = state.LISTED_CINEMAS
        return this.emit(':ask', `Which cinema do you want to see? ${cineco.CINEMAS.map(c => c.name).join(', ')}.`)
      case state.DEFAULT:
        return this._getMoviesFor('unicentro')
      default:
        this.Unhandled()
    }
  },
  NoIntent: function () {
    swich (this.attributes['state']) {
      case state.LISTED_MOVIES:
      case state.PROMPTED_TO_LIST_CINEMAS:
        this.attributes['state'] = 0
        return this.emit(':tell', `Ok`)
      case state.DEFAULT:
        this.emit(':ask', `Do you want to check another cinema?`)
        return this.attributes['state'] = state.PROMPTED_TO_LIST_CINEMAS
      default:
        this.Unhandled()
    }
  },
  CancelIntent: function () {
    this.attributes['state'] = 0
    this.emit(':tell', 'Ok')
  },
  NumberIntent: function () {
    const slots  = this.event.request.intent.slots
    const number = slots.number.value

    swich (this.attributes['state']) {
      case state.LISTED_MOVIES:
        const movie = this.attributes['movies'][number]
        return this.emit(':tell', `For ${movie.title} the functions are: ${movie.functions.join(', ')}`)
      case  state.LISTED_CINEMAS:
        const cinema = cineco.CINEMAS[number]
        return this._getMoviesFor(cinema.name)
      default:
        this.Unhandled()
    }
  },
  SelectIntent: function () {
    const slots  = this.event.request.intent.slots
    const cinema = slots.cinema.value
    this._getMoviesFor(cinema)
  },
  Unhandled: function () {
    this.emit(':ask', `I'm sorry, can you repeat that again?`)
  }
};

function handler (event, context, callback) {
  var alexa = Alexa.handler(event, context)
  alexa.appId = 'amzn1.ask.skill.59245af3-f646-4348-98d2-47339ebe586f'
  alexa.registerHandlers(handlers)
  alexa.execute()
}

app.listen(PORT)
console.log('Listening on port ' + PORT + ', try http://localhost:' + PORT + '/alexa');
