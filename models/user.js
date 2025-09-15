const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');
const userSchema = new Schema({
    googleId: {
        type: String,
    },
    displayName: {
        type: String,
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', userSchema);
