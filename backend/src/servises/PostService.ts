import type IRequestCreatePost from "../interfaces/request/IRequestCreatePost";
import Post from "../dal/models/Post";
import PostModel, { type IPostDB } from "../dal/mongoDB/schemas/posts";
import UserModel, { type IUserDB } from "../dal/mongoDB/schemas/users";
import type IResponsePost from "../interfaces/response/IResponsePost";
import ApiError from "../utils/logicErrors/ApiError";
import { type Types } from "mongoose";
import type IRequestUpdatePost from "../interfaces/request/IRequestUpdatePost";
import { correctIDDB } from "../utils/correctIDDB";
import ImageService from "./ImageService";
import type IResponseComment from "../interfaces/response/IResponseComment";
import {
    commentsNameDB,
    type ICommentDB,
} from "../dal/mongoDB/schemas/comments";
import CommentService from "./CommentService";

class PostService {
    async createPost(
        userID: string,
        dataPost: IRequestCreatePost,
    ): Promise<IResponsePost> {
        const userDB: IUserDB | null = await UserModel.findById(userID);
        if (userDB == null) {
            throw Error("Ошибка добавления данных поста.");
        }

        const postClass = new Post(dataPost, userID);
        const postDB: IPostDB = await PostModel.create(postClass.objPost());

        userDB.posts.push(postDB._id);
        await userDB.save();

        return this.responsePostByDB(postDB);
    }

    async getPosts(): Promise<IResponsePost[]> {
        const posts: IPostDB[] = await PostModel.find();

        return posts.map((postDB: IPostDB): IResponsePost => {
            return this.responsePostByDB(postDB);
        });
    }

    async getPostByID(id: string): Promise<IResponsePost> {
        const postDB: IPostDB = await this.findPostDBByID(id);
        return this.responsePostByDB(postDB);
    }

    async updatePost(
        requestPost: IRequestUpdatePost,
        userID: string,
    ): Promise<void> {
        const postDB: IPostDB = await this.correctLogicFindPost(
            requestPost.id,
            userID,
        );

        const { name, description, images } = requestPost;
        await postDB.updateOne({ name, description, images });
    }

    async deletePostByID(id: string, userID: string): Promise<void> {
        const post: IPostDB = await this.correctLogicFindPost(id, userID);

        const userPost: IUserDB | null = await UserModel.findById(userID);
        if (userPost == null) {
            throw Error("Ошибка удаления данных поста.");
        }

        userPost.posts = userPost.posts.filter(
            (postId: Types.ObjectId) => String(postId) !== id,
        );

        ImageService.deleteImages(post.images);
        await userPost.save();
        await post.deleteOne();
    }

    async getComments(postID: string): Promise<IResponseComment[]> {
        const postDB: IPostDB = await this.findPostDBByID(postID);
        const { comments } = await postDB.populate<{
            comments: ICommentDB[];
        }>(commentsNameDB);
        return comments.map(CommentService.responseCommentByDB);
    }

    public async findPostDBByID(id: string): Promise<IPostDB> {
        const idPost: Types.ObjectId = correctIDDB(id);
        const post: IPostDB | null = await PostModel.findById(idPost);

        if (post == null) {
            throw ApiError.NotFound();
        }
        return post;
    }

    public responsePostByDB(postDB: IPostDB): IResponsePost {
        const { name, description, ownerID, createAt, images, _id, comments } =
            postDB;
        return {
            id: _id,
            name,
            description,
            createAt,
            ownerID,
            images,
            comments,
        };
    }

    private async correctLogicFindPost(
        id: string,
        userID: string,
    ): Promise<IPostDB> {
        const post: IPostDB = await this.findPostDBByID(id);

        if (String(post.ownerID) !== userID) {
            throw ApiError.Forbidden();
        }
        return post;
    }
}

export default new PostService();
