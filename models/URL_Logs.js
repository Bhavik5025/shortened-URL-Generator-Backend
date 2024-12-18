const mongoose = require('mongoose');
const Url_Logs=mongoose.Schema(
    {
        url_id:String,

        count:Number,
        status:String,
        Device_name:String,
        ipAddress:String,

    }
    ,{ timestamps: true }
)


module.exports = mongoose.model('URL_Logs',Url_Logs);