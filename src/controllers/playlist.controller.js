import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Video} from "../models/video.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    //TODO: create playlist
    if(!name || !description)
    {
        throw new ApiError(400,"Both name and description is required")
    }

    const playlist=await Playlist.create({
        name:name,
        description:description,
        owner:req.user?._id
    })

    if(!playlist)
    {
        throw new ApiError(500,"Error while creating playlist")
    }

    return res.status(200).json(
        new ApiResponse(200,playlist,"Playlist created successfully")
    )

})//done

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if(!isValidObjectId(userId))
    {
        throw new ApiError(200,"Invalid userId");
    }

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                }
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                updatedAt: 1
            }
        }
    ]);

    return res
    .status(200)
    .json(new ApiResponse(200, playlists, "User playlists fetched successfully"));

})//done

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id

    if(!isValidObjectId(playlistId))
    {
        throw new ApiError(400,"Invalid playlistId");
    }

    const playlist=await Playlist.aggregate([
        {
            $match:{
                _id:playlistId
            }
        }, 
        {
            $lookup:{
                from:"videos",
                localField:"videos",
                foreignField:"_id",
                as:"videos"
            }
        },
        {
            $match:{
                "videos.isPublished":true
            }
        },
        {
            $lookup:{
                from :"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner"
            }
        },
        {
            $addFields:{
                totalVideos:{
                    $size:"$videos"
                },
                owner:{
                    $first:"$owner"
                }
                
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,
                videos: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    createdAt: 1,
                    views: 1
                },
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                }
            }
        }
    ])


    return res.status(200).json(
        new ApiResponse(200,playlist,"Playlist fetched successfully")
    )
})//done

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(playlistId))
    {
        throw new ApiError(400,"Invalid PlaylistId");
    }

    if(!isValidObjectId(videoId))
    {
        throw new ApiError(400,"Invalid videoId")
    }

    const playlist=await Playlist.findById(playlistId);
    const video=await Video.findById(videoId);
    
    if(!playlist)
    {
        throw new ApiError(400,"Playlist does not exist");
    }

    if(!video)
    {
        throw new ApiError(400,"Video does not exist")
    }

    if(playlist.owner.toString()!==req.user._id.toString())
    {
        throw new ApiError(400,"Only owner can add new videos to playlist")
    }

    const result=Playlist.findByIdAndUpdate(playlistId,{
        $addToSet:{videos:videoId}
    },{
        new:true
    })

    return res.status(200).json(
        new ApiResponse(200,result,"Video added successfully")
    )
})//done

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
    if(!isValidObjectId(playlistId))
    {
        throw new ApiError(400,"Invalid PlaylistId");
    }

    if(!isValidObjectId(videoId))
    {
        throw new ApiError(400,"Invalid videoId")
    }

    const playlist=await Playlist.findById(playlistId);
    const video=await Video.findById(videoId);

    if(!playlist)
    {
        throw new ApiError(400,"Playlist does not exist");
    }

    if(!video)
    {
        throw new ApiError(400,"Video does not exist")
    }

    if(playlist.owner.toString()!==req.user._id.toString())
    {
        throw new ApiError(400,"Only owner can remove videos from playlist")
    }

    const result =await Playlist.findByIdAndUpdate(playlistId,{
        $pull:{
            videos:videoId
        }
    },{
        new:true
    })

    return res.status(200).json(
        new ApiResponse(200,result,"Videp removed successfully")
    )

})//done  

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    if(!playlistId)
    {
        throw new ApiError(400,"Invalid playlistID");
    }

    const playlist=await Playlist.findById(playlistId);

    if(!playlist)
    {
        throw new ApiError(400,"Playlist does not exist");
    }

    if(playlist.owner.toString()!==req.user?._id.toString())
    {
        throw new ApiError(400,"Only owner can delete playlist")
    }

    const result=await Playlist.findByIdAndDelete(playlistId);

    if(!result)
    {
        throw new ApiError(500,"Error while deleting playlist")
    }

    return res.status(200).json(
        new ApiResponse(200,result,"Playlist deleted successfully")
    )
})//done

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
    if(!playlistId)
    {
        throw new ApiError(400,"Invalid playlistId");
    }

    const playlistOwner=await Playlist.findById(playlistId);

    if(!playlistId)
    {
        throw new ApiError(400,"Playlist doesnot exist")
    }

    if(req.user?._id.toString()!==playlistOwner.owner.toString())
    {
        throw new ApiError(400,"Only owner can update playlist")
    }

    if(!name ||!description)
    {
        throw new ApiError(400,"Both name and description is required")
    }

    const updatedPlaylist=await Playlist.findByIdAndUpdate(playlistId,
        {
            $set:{
                name:name,
                description:description
            }
        },
        {
            new:true
        }
        )

    if(!updatePlaylist)
    {
        throw new ApiError(400,"Error while updating playlist");
    }

    return res.status(200).json(
        new ApiResponse(200,updatedPlaylist,"Playlist updated successfully")
    )
  
})//done

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
