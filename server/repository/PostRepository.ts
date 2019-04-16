import { v4 } from 'uuid';

import pgp from "../util/db";
import { Post } from '../model/Post';
import { postQueries } from '../util/sql/queries';
import { getCurrentMoment, singleToArray } from '../util/helper/util';
import { Image } from '../util/helper/Image';


export class PostRepository {

    async fetch(size?: number | 5, lastItemId?: string) {
        if (lastItemId) {
            const posts = await pgp.manyOrNone(postQueries.fetchWithLimit, { size, id: lastItemId })
            return posts || [];
        } else {
            const posts = await pgp.manyOrNone(postQueries.fetch, { size });
            return posts || [];
        }
    }
    
    async findPost(postId: string) {
        const post = await pgp.oneOrNone(postQueries.getPostInformation, { postId });
        if (!post) {
            return post;
        } else {
            post.images = await pgp.manyOrNone(postQueries.getImagesFromPost, { postId })
            return post;
        }
    }

    async createPost(post: Post, images: Express.Multer.File[]) {
        const createdPost = await pgp.tx(async tx => {
            const { userId, description, coordinates, title } = post;
            const postId = v4();
            const createdAt = getCurrentMoment();
            await tx.none(postQueries.createPost, { id: postId, userId, title, description, coordinates, createdAt, postType: 1 });
            const _images = await Promise.all(images.map(async image => {
                const imageId = v4();
                const { path, filename } = image;
                const url = `uploads/${filename}`;
                const createdAt = getCurrentMoment();
                await tx.none(postQueries.createPostImage, { id: imageId, postId, path, createdAt, url });
                return { imageId, url, filename }
            }));

            return { id: postId, userId, title, description, coordinates, createdAt, images: _images };
        });

        return createdPost;
    }

    async updatePost(post: Post, images?: Express.Multer.File[]) {
        const { id, description, coordinates, title } = post;
        await pgp.tx(async tx => {
            await tx.none(postQueries.updatePost, { id, title, description, coordinates });
            if (images) {
                await Promise.all(images.map(async image => {
                    const imageId = v4();
                    const { path, filename } = image;
                    const url = `uploads/${filename}`;
                    const createdAt = getCurrentMoment();
                    await tx.none(postQueries.createPostImage, { id: imageId, postId: id, path, createdAt, url });
                }));
            }
        });
        return await this.findPost(id);
    }

    async deletePost(id: string) {
        await pgp.none(postQueries.deletePost, { id });
    }

    async deletePostPictures(urls: string | string[]) {
        const _urls = singleToArray(urls);
        await pgp.tx(async tx => {
            await Promise.all(_urls.map(async url => tx.none(postQueries.deletePicture, { url })));
        })
    }

    async getPostPicturesByUrl(url: string): Promise<Image> {
        const picture = await pgp.one(postQueries.getPostImage, { url })
        return picture;
    }

}