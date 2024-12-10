var mongoose=require("mongoose");
const UserSchema=mongoose.Schema(
    {
       name:String,
       password:String,
    }

);
module.exports=mongoose.model("Users",UserSchema);