import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/Apiresponse.js";

const registerUser=asyncHandler(async (req,res)=>{
   //get user details from frontend
   //validation
   //check if user already exist:username,email
   //check for images ,avatar
   //upload them to cloudinary ,avatar
   //create user object -create entry in db
   //remove password and refresh token field from response
   //check for user creation
   //return res

   const  {fullName,email,username,password}=req.body
   console.log("email: ",email);

   if([fullName,email,username,password].some((field)=>
   field?.trim()==="")
   ){
    throw new ApiError(400,"All fields are compulsory")
   }

   const existedUser=User.findOne({
    $or:[{ email },{ username }]
   })

   if(existedUser){
    throw new ApiError(409,"User with email already existed ")
   }

   const avatarLocalPath=req.files?.avatar[0]?.path;
   const coverImageLocalPath=req.files?.coverImage[0]?.path;

   if(!avatarLocalPath)
   {
    throw new ApiError(400,"Avatar is required")
   }

   const avatar=await uploadOnCloudinary(avatarLocalPath)
   const coverImage=await uploadOnCloudinary(coverImageLocalPath)

   if(!avatar)
   {
    throw new ApiError(400,"Avatar is required")
   }

   // talking to dbms to create an entry

   const user =await  User.create({
    fullName,
    avatar:avatar.url,
    coverImage:coverImage?.url||"",
    email,
    password,
    username:username.toLowerCase()

   })

   const createdUser=await User.findById(user._id).select("-password -refreshToken" )// in select - represent which we dont want 

   if(!createdUser)
   {
    throw new ApiError(500,"Something went wrong wile registering")
   }

   return res.status(200).json(
    new ApiResponse(200,createdUser,"User registered successfully")
    )

})

export {registerUser}