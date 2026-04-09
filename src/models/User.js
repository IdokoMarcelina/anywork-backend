import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  isVerified: { type: Boolean, default: false },
  otp: { type: String, default: null },      
  otpExpires: { type: Date, default: null },  
  avatar: { type: String, default: null },       
  skill: { type: String, default: null }, 
   rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
  },
});

userSchema.pre("save", async function () {  
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

export default mongoose.model("User", userSchema);