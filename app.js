var builder = require('botbuilder');
var restify = require('restify');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url);
});

// var appId = "a47248b9-5085-4582-936a-0963667e601f";
// var appPassword = "V9k6#}*l9H!y4*=PW491^_T//Lkl}?";

// var connector = new builder.ChatConnector({
//     appId: appId,
//     appPassword: appPassword
// });

var connector = new builder.ChatConnector();

server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector);

var inMemoryStorage = new builder.MemoryBotStorage();
bot.set('storage', inMemoryStorage);

var luisAppId = "b601f076-b192-4934-8049-d6d765dfdaa4";
var luisAPIKey = "c0b9fb45d2b84c4284a56024f8327155";
var luisAPIHostName = "westus.api.cognitive.microsoft.com";

const luisModelUrl = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisAPIKey;

var recognizer = new builder.LuisRecognizer(luisModelUrl);
var intents = new builder.IntentDialog({
    recognizers: [recognizer]
});

bot.dialog('/', intents);

intents.matches('Greet', (session, args, next) => {
    session.send("Hello there! I'm virutal agent, the movie ticket booking bot. How can I help you today?");
});

var movies = [
    "Avengers",
    "Jurassic World",
    "The Incredibles 2"
];

intents.matches('ShowNowPlaying', (session, args, next) => {
    session.send("Sure, here is the list of movies currently playing:\n\n" + movies.join("\n\n"));
});

intents.matches('BookTicket', [(session, args, next) => {
    console.log(JSON.stringify(args));

    var movieEntity = args.entities.filter(e => e.type == 'Movies');
    var noOfTicketsEntity = args.entities.filter(e => e.type == "builtin.number");

    if (movieEntity.length > 0) {
        session.userData.movie = movieEntity[0].resolution.values[0];
    } else {
        delete session.userData.movie;
    }

    if (noOfTicketsEntity.length > 0) {
        session.userData.noOfTickets = noOfTicketsEntity[0].resolution.value;
    } else {
        delete session.userData.noOfTickets;
    }

    if (!session.userData.movie) {
        session.send("Sorry,The entered movie is not available");
        session.beginDialog('askMovie');
    } else {
        next();
    }
}, (session, args, next) => {

    if (!session.userData.noOfTickets) {
        session.beginDialog('askNoOfTickets');
    } else {
        next();
    }

}, (session, args, next) => {
    session.send("Sure, I have booked you " + session.userData.noOfTickets + " tickets for " + session.userData.movie + ". Have fun!");
}]);

bot.dialog('askMovie', [(session, args, next) => {
    builder.Prompts.choice(session, 'What movie would you like to watch?', movies);
}, (session, results) => {
    session.userData.movie = results.response.entity;
    session.endDialogWithResult(results);
}]);

bot.dialog('askNoOfTickets', [(session, args, next) => {
    builder.Prompts.number(session, 'Great! How many tickets would you like to book?');
}, (session, results) => {
    session.userData.noOfTickets = results.response;
    session.endDialogWithResult(results);
}]);
