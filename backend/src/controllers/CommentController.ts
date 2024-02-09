import { type Request, type Response, type NextFunction } from "express";
import CommentService from "../servises/CommentService";
import type IResponseComment from "../interfaces/response/IResponseComment";
import type IRequestUserAuth from "../interfaces/request/IRequestUserAuth";
import IUserDto from "../utils/token/UserDto/IUserDto";
import UserDto from "../utils/token/UserDto/UserDto";
import type IRequestCreateComment from "../interfaces/request/IRequestCreateComment";
import type IRequestCreatePost from "../interfaces/request/IRequestCreatePost";
import UserController from "./UserController";
import IRequestUpdateComment from "../interfaces/request/IRequestUpdateComment";

class CommentController {
    async getCommentByID(
        req: Request<{ id: string }>,
        res: Response<IResponseComment>,
        next: NextFunction,
    ): Promise<void> {
        try {
            const { id } = req.params;
            const comment: IResponseComment =
                await CommentService.getCommentByID(id);
            res.status(200).json(comment);
        } catch (e) {
            next(e);
        }
    }

    async postComment(
        req: IRequestUserAuth<IRequestCreateComment>,
        res: Response<IResponseComment>,
        next: NextFunction,
    ): Promise<void> {
        try {
            const { id: userID } = UserDto.haveUserData(req);
            const dataComment: IRequestCreateComment = req.body;
            const comment: IResponseComment =
                await CommentService.createComment(userID, dataComment);
            res.status(201).json(comment);
        } catch (e) {
            next(e);
        }
    }

    async updateComment(
        req: IRequestUserAuth<IRequestUpdateComment>,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        const { id: userID } = UserDto.haveUserData(req);
        const dataUpdateComment: IRequestUpdateComment = req.body;
        await CommentService.updateComment(userID, dataUpdateComment);
        res.sendStatus(200);
    }

    async deleteComment(
        req: IRequestUserAuth<{}, { id: string }>,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const { id: userID } = UserDto.haveUserData(req);
            const { id: commentID } = req.params;
            await CommentService.deleteComment(userID, commentID);
            res.sendStatus(200);
        } catch (e) {
            next(e);
        }
    }
}

export default new CommentController();
