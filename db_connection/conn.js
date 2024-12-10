const mongoose=require("mongoose");
mongoose.connect("mongodb://localhost:27017/Assignment").catch(error => handleError(error));