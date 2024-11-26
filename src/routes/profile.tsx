import { useMainStore } from "@/hooks/useMainStore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Server, Boxes } from "lucide-react";
import { useServer } from "@/hooks/useServer";
import { ProfileCard } from "@/components/profile";

export default function ProfilePage() {
    const { profile } = useMainStore();
    const { servers, serverGroups } = useServer();
    const isDesktop = useMediaQuery("(min-width: 890px)")

    return (
        profile && (
            <div className={`flex p-8 gap-4 ${isDesktop ? 'ml-6' : 'flex-col'}`}>
                <div className={`flex ${isDesktop ? 'flex-col mr-6' : 'gap-4 w-full items-center'}`}>
                    <Avatar className={`${isDesktop ? 'h-[300px] w-[300px]' : 'h-[150px] w-[150px]'} border-foreground border-[1px]`}>
                        <AvatarImage src={'https://api.dicebear.com/7.x/notionists/svg?seed=' + profile.username} alt={profile.username} />
                        <AvatarFallback>{profile.username}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="justify-center text-3xl font-semibold">{profile.username}</p>
                        <p className="text-gray-400">IP: {profile.login_ip || 'Unknown'}</p>
                    </div>
                    {isDesktop &&
                        <ProfileCard className="flex mt-4 justify-center items-center max-w-[300px] rounded-lg" />
                    }
                </div>
                {!isDesktop &&
                    <ProfileCard className="flex justify-center items-center max-w-full rounded-lg" />
                }
                <div className="w-full">
                    <div className="flex flex-col gap-4">
                        <Card className="w-full">
                            <CardHeader>
                                <CardTitle className="flex gap-2 text-xl items-center">
                                    <Server /> Servers
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-lg font-semibold">
                                {servers?.length || 0}
                            </CardContent>
                        </Card>
                        <Card className="w-full">
                            <CardHeader>
                                <CardTitle className="flex gap-2 text-xl items-center">
                                    <Boxes /> Server Groups
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-lg font-semibold">
                                {serverGroups?.length || 0}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        )
    );
}
