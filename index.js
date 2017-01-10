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

function _getMoviesFor (cinema) {
  cineco
    .getMoviesFor(cinema)
    .then(movies => {
      this.attributes['movies'] = movies
      this.attributes['state'] = states.LISTED_MOVIES
      this.emit(':ask', `There are these movies for today on ${cinema}: 
        ${movies.map((m, i) => `${m.title}`).join('\n')}.
        To check the functions say the index of the movie, otherwise say "stop" or "cancel" to quit.`)
    }, err => {
      console.error(err)
      this.emit(':tell', 'Sorry, I couldn\'t contact to Cineco')
    })
}

function _unhandled () {
  this.emit(':ask', `I'm sorry, can you repeat that again?`)
}

const handlers = {
  LaunchRequest: function () {
    console.log('Welcome to Cineco')
    this.attributes['state'] = states.DEFAULT
    this.emit(':ask', 'Welcome to Cineco, do you want to see what\'s on Unicentro?')
  },
  YesIntent: function () {
    switch (this.attributes['state']) {
      case states.LISTED_MOVIES:
        this.attributes['state'] = states.WHICH_CINEMA
        return this.emit(':ask', `Which one?`)
      case states.PROMPTED_TO_LIST_CINEMAS:
        this.attributes['state'] = states.LISTED_CINEMAS
        return this.emit(':ask', `Which cinema do you want to see? ${cineco.CINEMAS.map(c => c.name).join(', ')}.`)
      case states.DEFAULT:
        return _getMoviesFor.call(this, 'unicentro')
      default:
        _unhandled.call(this)
    }
  },
  NoIntent: function () {
    switch (this.attributes['state']) {
      case states.LISTED_MOVIES:
      case states.PROMPTED_TO_LIST_CINEMAS:
        this.attributes['state'] = 0
        return this.emit(':tell', `Ok`)
      case states.DEFAULT:
        this.emit(':ask', `Do you want to check another cinema?`)
        return this.attributes['state'] = states.PROMPTED_TO_LIST_CINEMAS
      default:
        _unhandled.call(this)
    }
  },
  CancelIntent: function () {
    this.attributes['state'] = 0
    this.emit(':tell', 'Ok')
  },
  NumberIntent: function () {
    const slots  = this.event.request.intent.slots
    const number = slots.number.value

    switch (this.attributes['state']) {
      case states.LISTED_MOVIES:
        const movie = this.attributes['movies'][number]
        return this.emit(':tell', `For ${movie.title} the functions are: ${movie.functions.join(', ')}`)
      case  states.LISTED_CINEMAS:
        const cinema = cineco.CINEMAS[number]
        return _getMoviesFor.call(this, cinema.name)
      default:
        _unhandled.call(this)
    }
  },
  SelectIntent: function () {
    const slots  = this.event.request.intent.slots
    const cinema = slots.cinema.value
    _getMoviesFor.call(this, cinema)
  },
  Unhandled: _unhandled
};

function handler (event, context, callback) {
  var alexa = Alexa.handler(event, context)
  alexa.appId = 'amzn1.ask.skill.59245af3-f646-4348-98d2-47339ebe586f'
  alexa.registerHandlers(handlers)
  alexa.execute()
}

app.listen(PORT)
console.log('Listening on port ' + PORT + ', try http://localhost:' + PORT + '/alexa');
