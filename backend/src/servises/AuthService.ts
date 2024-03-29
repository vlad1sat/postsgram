import type IRequestUser from "../interfaces/request/IRequestUser";
import UserModel, { type IUserDB } from "../dal/mongoDB/schemas/users";
import bcrypt from "bcrypt";
import User from "../dal/models/User";
import ApiError from "../utils/logicErrors/ApiError";
import UserDto from "../utils/token/UserDto/UserDto";
import type IRequestLoginUser from "../interfaces/request/IRequestLoginUser";
import { type ITokenDB } from "../dal/mongoDB/schemas/refreshToken";
import type ILogicAuth from "../interfaces/ILogicAuth";
import TokenService, { type IGenerateTokens } from "./TokenService";
import { instanceOfIUserDto } from "../utils/token/UserDto/IUserDto";

class AuthService {
    async registration(user: IRequestUser): Promise<ILogicAuth> {
        const { username, email, password } = user;
        const userDB: IUserDB | null = await this.findUserDBByFilter(
            { username },
            { email },
        );
        if (userDB != null) {
            throw ApiError.BadRequest(
                "Пользователь с такими данными уже существует!",
            );
        }

        const hashPassword: string = await bcrypt.hash(password, 5);
        const newUser = new User({ ...user, password: hashPassword });
        const createdUserDB: IUserDB = await UserModel.create(
            newUser.objUser(),
        );

        return await AuthService.tokenUserLogic(createdUserDB);
    }

    async login(userData: IRequestLoginUser): Promise<ILogicAuth> {
        const { login, password: passwordData } = userData;
        const userDB: IUserDB | null = await this.findUserDBByFilter(
            { username: login },
            { email: login },
        );

        if (userDB == null) {
            throw ApiError.BadRequest("Такого пользователя не существует!");
        }

        const { password } = userDB;
        const isCorrectPassword: boolean = await bcrypt.compare(
            passwordData,
            password,
        );

        if (!isCorrectPassword) {
            throw ApiError.BadRequest("Неверный пароль!");
        }
        return await AuthService.tokenUserLogic(userDB);
    }

    async refresh(refreshToken: string): Promise<ILogicAuth> {
        if (refreshToken == null) {
            throw ApiError.Unauthorized();
        }

        const userTokenDto = TokenService.correctRefreshToken(refreshToken);
        const tokenDB: ITokenDB | null =
            await TokenService.findRefreshTokenDB(refreshToken);
        if (!instanceOfIUserDto(userTokenDto) || tokenDB == null) {
            throw ApiError.Unauthorized();
        }

        const userDB: IUserDB | null = await UserModel.findById(
            userTokenDto.id,
        );
        if (userDB == null) {
            throw ApiError.Unauthorized();
        }

        return await AuthService.tokenUserLogic(userDB);
    }

    private static async tokenUserLogic(user: IUserDB): Promise<ILogicAuth> {
        const userDto: UserDto = new UserDto(user);
        const tokens: IGenerateTokens = TokenService.generateToken({
            ...userDto,
        });

        await TokenService.saveRefreshTokenDB(user._id, tokens.refreshToken);
        return {
            tokens,
            user: userDto,
        };
    }

    private async findUserDBByFilter(
        ...filters: Array<Record<PropertyKey, unknown>>
    ): Promise<IUserDB | null> {
        const userDB: IUserDB | null = await UserModel.findOne({
            $or: filters,
        });
        return userDB;
    }
}

export default new AuthService();
