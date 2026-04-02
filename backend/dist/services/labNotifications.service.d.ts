export declare function notifyUser(userId: string, type: string, title: string, body: string, link?: string | null): Promise<{
    id: string;
    createdAt: Date;
    userId: string;
    type: string;
    title: string;
    body: string;
    read: boolean;
    link: string | null;
}>;
