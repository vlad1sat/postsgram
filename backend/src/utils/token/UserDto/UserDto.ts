import { type IUserDB } from "../../../dal/mongoDB/schemas/users";
import type IUserDto from "./IUserDto";
import type RequestUserAuth from "../../../interfaces/RequestUserAuth";
import ApiError from "../../logicErrors/ApiError";

export default class UserDto implements IUserDto {
    email: string;
    username: string;
    id: string;

    constructor(user: IUserDB) {
        const { username, email, _id } = user;
        this.id = _id.toString();
        this.username = username;
        this.email = email;
    }

    static haveUserData(req: RequestUserAuth): IUserDto {
        const { user } = req;
        if (user == null) {
            throw ApiError.Unauthorized();
        }
        return user;
    }
}
