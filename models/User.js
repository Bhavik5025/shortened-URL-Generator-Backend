var mongoose=require("mongoose");
const UserSchema=mongoose.Schema(
    {
       name:String,
       password:String,
    }
    , { timestamps: true }
);
module.exports=mongoose.model("Users",UserSchema);