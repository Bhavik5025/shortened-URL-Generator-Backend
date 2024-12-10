const mongoose = require('mongoose');
const countschema=mongoose.Schema(
    {
        url_id:String,

        count:Number,
        status:String,

    }
    ,{ timestamps: true }
)


module.exports = mongoose.model('Count', countschema);