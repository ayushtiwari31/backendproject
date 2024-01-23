import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary, deleteOnCloudinary} from "../utils/cloudinary.js"



const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination


    // options={
    //     page:parseInt(page),
    //     limit:parseInt(limit),
    //     sort: sortBy ? { [sortBy]: sortType === 'desc' ? -1 : 1 } : undefined,
    // }

    // queries={
    //     $text:{
    //         $search:query,
    //     }
    // }


    const pipeline=[];
    if(query)
    {
        pipeline.push({
            $search:{
                index:"search-text",
                text:{
                    query:query,
                    path:["title","description"]//search only on title and description
                }
            }
        })
    }


    if(userId)
    {
        if(!isValidObjectId(userId))
        {
            throw new ApiError(400,"Invalid userId");
        }

        pipeline.push({
            $match:{
                owner:new mongoose.Types.ObjectId(userId)
            }
        })
    }

      // fetch videos only that are set isPublished as true
      pipeline.push({ $match: { isPublished: true } });

       //sortBy can be views, createdAt, duration
    //sortType can be ascending(-1) or descending(1)

    if(sortBy && sortType)
    {
        pipeline.push({
            $sort:{
                [sortBy]:sortType==='asc'?1:-1
            }
        })
    }
    else{
        pipeline.push({
            $sort:{
                createdAt:-1
            }
        })
    }

    const videoAggregate=Video.aggregate(pipeline)

    const options={
        page:parseInt(page,10),
        limit:parseInt(limit,10)
    }

    await Video.aggregatePaginate(videoAggregate,options).then((result)=>{
        return res.status(200).json(
            new ApiResponse(200,result,"Videos fetched successfully")
        )
    }).catch((err)=>{
        throw new ApiError(500,"server not responding!!")
    })


})//done

const publishAVideo = asyncHandler(async (req, res) => { 
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    if ([title, description].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const videoLocalPath=req.files?.videoFile[0].path;
    const thumbnailLocalPath=req.files?.thumbnail[0].path;

    if(!videoLocalPath)
    {
        throw new ApiError(400,"Video is required!!")
    }

    if(!thumbnailLocalPath)
    {
        throw new ApiError(400,"Thumnail is required!!")
    }

    const video=await uploadOnCloudinary(videoPath);
    const thumbnail=await uploadOnCloudinary(thumbnailLocalPath);

    if(!video)
    {
        throw new ApiError(400,"Error while uploading video");
    }

    if(!thumbnail)
    {
        throw new ApiError(400,"Error while uploading thumbnail")
    }

   
    const publish=await Video.create({
        videoFile:video.url,
        title,
        description,
        isPublished:true,
        owner,
        duration:video.duration,
        thumbnail:thumbnail.url,
        owner:req.user?._id
    })

    const publishedFile=await Video.findById(publish._id);

    if(!publishedFile)
    {
        throw new ApiError(500,"Error while publishing video and thumbnail");
    }

    return res.status(200).json(
        new ApiResponse(200,publish,"Successfully Published !!")
    )

})//done

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    if(!isValidObjectId(videoId))
    {
        throw new ApiError(400,"VideoId is not valid!!")
    }

    const video=await Video.aggregate([
        {
            $match:{
                _id:videoId
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"likes"
            }
        },
        {
            $lookup:{
                from :"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
                pipeline:[
                    {
                        $lookup:{
                            from:"subscriptions",
                            localField:"_id",
                            foreignField:"channel",
                            as:"subscribers"
                        }
                    },
                    {
                        $addFields:{
                            subscribersCount:{
                                $size:"$subscribers"
                            },
                            isSubscribed:{
                                $cond:{
                                    if:{
                                        $in:[
                                            req.user?._id,"$subscribers"
                                        ]
                                    },
                                    then:true,
                                    else:false
                                }
                            }
                        }
                    },
                    {
                        $project:{
                            username:1,
                            "avatar.url":1,
                            subscribersCount:1,
                            isSubscribed:1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                likesCount:{
                    $size:"$likes"
                },
                owner:{
                    $first:"$owner"
                },
                isLiked:{
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$likes.likedBy"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{
                "videoFile.url": 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1
            }
        }
    ]);

    if(!video)
    {
        throw new ApiError(500,"Failed to fetch video!!")
    }

    //incrementing views

    await Video.findByIdAndUpdate(videoId,{
        $inc:{
            views:1
        }
    })

     // add this video to user watch history
     await User.findByIdAndUpdate(req.user?._id, {
        $addToSet: {
            watchHistory: videoId
        }
    });

    return res.status(200).json(
        new ApiResponse(200,video,"Video fetched successfully!!")
    )
})//done


const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
