import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { application } from "express"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if(!isValidObjectId(channelId))
    {
        throw new ApiError(400,"Invalid channelId");
    }

    const subscribed=await Subscription.findOne(
        {
            channel:channelId,
            subscriber:req.user?._id
        }
    )

    if(subscribed)
    {
        const unsubscribed=await Subscription.findByIdAndDelete(subscribed?._id);
        if(!unsubscribed)
        {
            throw new ApiError(500,"Error while unsubscribing channel")
        }

        return res.status(200).json(
            new ApiResponse(200,unsubscribed,"Unsubscribed Successfully")
        )
    }
    
    const subscribe=await Subscription.create(
        {
            channel:channelId,
            subscriber:req.user?._id
        }
    )

    if(!subscribe)
    {
        throw new ApiError(500,"Error while subscribing channel")
    }

    return res.status(200).json(
        new ApiResponse(200,subscribe,"Subscribed Successfully")
    )
})//done

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!isValidObjectId(channelId))
    {
        throw new ApiError(400,"Invalid channelId");
    }

    const allSubscribers=await Subscription.aggregate([
        {
            $match:{
                channel:channelId
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"subscriber",
                foreignField:"_id",
                as:"subscribers",
                pipeline:[
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribedToSubscriber",
                        }
                    },
                    {
                        $addFields:{
                            subscribedToSubscriber: {
                                $cond: {
                                    if: {
                                        $in: [
                                            channelId,
                                            "$subscribedToSubscriber.subscriber",
                                        ],
                                    },
                                    then: true,
                                    else: false,
                                }
                            }
                        },

                        subscribersCount: {
                            $size: "$subscribedToSubscriber",
                        }
                    }
                ]

            }
        },
        {
            $unwind:"$subscribers"
        },
        {
            $project:{
                _id:0,
                subscriber:{
                    _id:1,
                    username:1,
                    fullName:1,
                    "avatar.url":1,
                    subscribedToSubscriber: 1,
                    subscribersCount: 1,
                }
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200,allSubscribers,"Subscribers list fetched successfully")
    )
})//done

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if(!subscriberId)
    {
        throw new ApiError(400,"Invalid subscriberID");
    }

    const result=await Subscription.aggregate([
        {
            $match:{
                subscriber:subscriberId
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"channel",
                foreignField:"_id",
                as:"subscribedChannel",
                pipeline:[
                    {
                        $lookup:{
                            from:"videos",
                            localField:"_id",
                            foreignField:"owner",
                            as:"videos"
                        }
                    },
                    {
                        $addFields:{
                            latestVideo:{
                                $last:"$videos"
                            }
                        }
                    }
                ]
            }
        },
        {
            $unwind:"$subscribedChannel"
        },
        {
            $project:{
                _id: 0,
                subscribedChannel: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1,
                    latestVideo: {
                        _id: 1,
                        "videoFile.url": 1,
                        "thumbnail.url": 1,
                        owner: 1,
                        title: 1,
                        description: 1,
                        duration: 1,
                        createdAt: 1,
                    }
                }
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200,result,"Channel list fetched successfully")
    )
})//done

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}