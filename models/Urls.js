const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  shortened_url: { type: String, required: true },
  friendly_name:  String ,
  user_id: String,
  secret_key:Number,
  expired:Boolean,
  
}, { timestamps: true });

module.exports = mongoose.model('Url', urlSchema);
