const asyncHandler=(requestHandler)=>{
    return (req,resp,next)=>{
        Promise.resolve(requestHandler).catch((err)=>next(err))
    }
}
export {asyncHandler}