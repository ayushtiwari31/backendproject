import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    if(!isValidObjectId(videoId))
    {
        throw new ApiError(400,"Invalid videoId!!")
    }
    

    const likedAlready=await Like.findOne({
        video:videoId,
        likedBy:req.user?._id
    })

    if(likedAlready)
    {
        await Like.findByIdAndDelete(likedAlready?._id)

        return res.status(200).json(
            new ApiResponse(200,"Video unliked Successfully")
        )
    }

    await Like.create({
        video:new ObjectId(videoId),
        likedBy:req.user?._id
    })

    return res.status(200,"Video liked Successfully");



    // const userId=req.user?._id;

    // const video=await Like.aggregate([
    //     {
    //         $match:{
    //             video:videoId,likedBy:userId
    //         }
    //     },
    //     {
    //         $project:{
    //             _id:1
    //         }
    //     }
    // ])

    // const objectIds=video.map( _id =>  ObjectId(_id));

    // const result=await Like.deleteMany({
    //     _id:{
    //         $in:objectIds
    //     }
    // })

    // if(!result)
    // {
    //     throw new ApiError(500,"Unable to toggle Like!!")
    // }

    // return res.status(200).json(
    //     new ApiResponse(200,result ,"Like toggled successfully")
    // )
   
})//done

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment

    if(!isValidObjectId(commentId))
    {
        throw new ApiError(400,"Invalid videoId!!")
    }

    const likedAlready=await Like.findOne({
        comment:commentId,
        likedBy:req.user?._id
    })

    if(likedAlready)
    {
        await Like.findByIdAndDelete(likedAlready?._id);

        return res.status(200).json(
            new ApiResponse(200,"Comment Unlike Successfully")
        )
    }

    await Like.create({
        comment:commentId,
        likedBy:req.user?._id
    })
     
    return res.status(200).json(
        new ApiResponse(200,"Comment liked successfully")
    )

})//done

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet

    if(!isValidObjectId(tweetId))
    {
        throw new ApiError(400,"Invalid videoId!!")
    }

    const likedAlready=await Like.findOne({
        tweet:tweetId,
        likedBy:req.user?._id
    })

    if(likedAlready)
    {
        await Like.findByIdAndDelete(likedAlready?._id);

        return res.status(200).json(
            new ApiResponse(200,"Tweet Unlike Successfully")
        )
    }

    await Like.create({
        tweet:tweetId,
        likedBy:req.user?._id
    })
     
    return res.status(200).json(
        new ApiResponse(200,"Tweet liked successfully")
    )

}
)//done

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    
    const likedVideos=await Like.aggregate([
        {
            $match:{
                LikedBy:new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"likedVideo",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"ownerDetails",
                        }
                    },
                    {
                        $unwind:"$ownerDetails"
                    }
                ]
            }
        },
        {
            $unwind:"$likedVideo"
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                _id: 0,
                likedVideo: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    ownerDetails: {
                        username: 1,
                        fullName: 1,
                        "avatar.url": 1,
                    },
                },
            },
        },
    ])
    
    return res.status(200).json(
        new ApiResponse(200,likedVideos,"liked videos fetched successfully")
    )

})//done

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}