import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!isValidObjectId(videoId))
    {
        throw new ApiError(400,"Invalid videoId");
    }

    const comments=await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes",
            },
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes",
                },
                owner: {
                    $first: "$owner",
                },
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likes.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            },
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1,
                },
                isLiked: 1
            },
        },
    ])

    const options={
        page:parseInt(page,10),
        limit:parseInt(limit,10)
    }

    await Comment.aggregatePaginate(comments,options).then((result)=>{
        return res.status(200).json(
            new ApiResponse(200,result,"Comments loaded successfully")
        )
    }).catch((err)=>{
        throw new ApiError(500,"Comments can't be loaded.Try after sometime!!")
    })

})//done

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video

    const {videoId} = req.params
    const {comment}=req.body
    if(!isValidObjectId(videoId))
    {
        throw new ApiError(400,"Invalid videoId");
    }

    if(comment.trim()==="")
    {
        throw new ApiError(400,"Invalid comment")
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const result=await Comment.create({
        video:videoId,
        content:comment,
        owner:req.user?._id
    })

    if(!result)
    {
        throw new ApiError(500,"Comments can't be added")
    }

    return res.status(200).json(
        new ApiResponse(200,result,"Comments added successfully")
    )
})//done

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment

    const {commentId}=req.params;

    if(!isValidObjectId(commentId))
    {
        throw new ApiError(400,"Invalid commentId");
    }

    const {comment}=req.body;

    if (comment?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "only comment owner can edit their comment");
    }//checking if comment owner is editing or not

    if(comment.trim()==="")
    {
        throw new ApiError(400,"Invalid comment");
    }

    const result=await Comment.findByIdAndUpdate(commentId,
        {
            $set:{
                content:comment
            }
        },
        { new: true })

        return res.status(200).json(
            new ApiResponse(200,result,"Comment updated successfully")
        )

})//done

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId}=req.params;

    if(!isValidObjectId(commentId))
    {
        throw new ApiError(400,"Invalid CommentID");
    }

    const comment=await Comment.findById(commentId);

    if(!comment)
    {
        throw new ApiError(400,"Comment not found");
    }

    const result=await Comment.findByIdAndDelete(commentId);

    if(!result)
    {
        throw new ApiError(500,"Comment can't be deleted");
    }

    return res.status(200).json(
        new ApiResponse(200,result,"Comment deleted successfully")
    )
})//done

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }
