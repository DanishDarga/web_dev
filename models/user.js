const mongoose = require('mongoose');
const Schema = mongoose.Schema;
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
    password: {
        type: String,
    }
});

module.exports = mongoose.model('User', userSchema);
