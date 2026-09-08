import { UserModel, type User, type UserDocument } from '../models/user.model';

export class UserRepository {
  public findById(id: string): Promise<UserDocument | null> {
    return UserModel.findById(id).exec();
  }

  public findActiveById(id: string): Promise<UserDocument | null> {
    return UserModel.findOne({ _id: id, isActive: true }).exec();
  }

  public findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return UserModel.findOne({ email: email.toLowerCase() }).select('+passwordHash').exec();
  }

  public create(
    user: Pick<User, 'name' | 'email' | 'passwordHash' | 'phone' | 'role'>,
  ): Promise<UserDocument> {
    return UserModel.create(user);
  }
}

export const userRepository = new UserRepository();
