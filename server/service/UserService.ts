import { UserRepository } from "../repository";
import { User } from "../model/User";
import { MailService } from "./MailService";
import { TokenService } from "./TokenService";
import { NotFoundException } from "../util/exceptions/NotFoundException";
import { InvalidCredentialsException } from "../util/exceptions/InvalidCredentialsException";
import { JwtTokenService } from "./JwtTokenService";
import { NotValidTokenException } from "../util/exceptions/NotValidTokenException";
import { removeUnusedImages } from "../util/helper/util";

/**
 * @todo 
 */

export class UserService {
    private userRepository: UserRepository;

    constructor() {
        this.userRepository = new UserRepository();
    }

    findAll(): Promise<User[]> {
        return this.userRepository.findAll();
    }

    async findOne(token: string): Promise<User> {
        const { data } = await JwtTokenService.decode(token);
        const user = await this.userRepository.findOne(data.id);
        if (!user) {
            throw new NotFoundException('user');
        } else {
            return user;
        }
    }

    async checkUserCredentials(username: string, password: string): Promise<boolean> {
        const userExists = await this.userRepository.usernameExists(username);
        if (userExists) {
            const match = await this.userRepository.checkUserCredentials(username, password);
            return match;
        } else {
            throw new NotFoundException('user');
        }
    }

    async create(data: User): Promise<User> {
        const user = await this.userRepository.create(data);
        await this.sendConfirmationEmail(user.id, user.email);
        return user;
    }

    usernameExists(username: string): Promise<boolean> {
        return this.userRepository.usernameExists(username);
    }

    emailExists(email: string): Promise<boolean> {
        return this.userRepository.emailExists(email);
    }

    async activateUser(_token: string): Promise<void> {
        const user = await this.userRepository.findUserByConfirmationToken(_token);
        if (user) {
            await this.userRepository.activateUser(_token, user);
        } else {
            throw new NotValidTokenException(_token);
        }
    }

    private async sendConfirmationEmail(userId: string, email: string): Promise<void> {
        const token = TokenService.generateWithUserId(userId, 1);
        await this.userRepository.createEmailConfirmationToken(token);
        try {
            await MailService.sendConfirmationEmail(email, token);
        } catch (error) {
            await this.userRepository.deleteEmailConfirmationToken(token.id);
        }
    }

    async doLogIn(username: string, password: string): Promise<string[]> {
        const valid = await this.checkUserCredentials(username, password);
        if (valid) {
            const user = await this.userRepository.findByUsername(username);
            const token = await JwtTokenService.generateToken({ id: user.id });
            const refreshToken = await JwtTokenService.generateRefreshToken(token);
            return [token, refreshToken];
        } else {
            throw new InvalidCredentialsException();
        }
    }

    async doLogOut(token: string) {
        JwtTokenService.invalidateRefreshToken(token);
    }

    async refreshToken(token: string, refreshToken: string) {
        return JwtTokenService.refreshToken(token, refreshToken);
    }

    async edit(user: User, token: string, file: Express.Multer.File) {
        const { data } = await JwtTokenService.decode(token);
        user.id = data.id;
        //check if a new avatar was registered
        if (file !== undefined) {
            const { path: oldAvatar } = await this.userRepository.getAvatarInformation(user.id);
            const updatedUser = await this.userRepository.edit(user, file)
            removeUnusedImages([oldAvatar!]);
            return updatedUser;
        } else {
            return this.userRepository.edit(user);
        }
    }
}