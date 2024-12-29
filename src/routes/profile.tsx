import { Oauth2RequestType, bindOauth2, getOauth2RedirectURL, unbindOauth2 } from "@/api/oauth2"
import { getProfile } from "@/api/user"
import { ProfileCard } from "@/components/profile"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMainStore } from "@/hooks/useMainStore"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { useServer } from "@/hooks/useServer"
import useSetting from "@/hooks/useSetting"
import { Boxes, Server } from "lucide-react"
import { useEffect } from "react"
import { toast } from "sonner"

export default function ProfilePage() {
    const { profile, setProfile } = useMainStore()
    const { servers, serverGroups } = useServer()
    const { data: settingData } = useSetting()
    const isDesktop = useMediaQuery("(min-width: 890px)")

    useEffect(() => {
        const oauth2Code = new URLSearchParams(window.location.search).get("code")
        const oauth2State = new URLSearchParams(window.location.search).get("state")
        const oauth2Provider = new URLSearchParams(window.location.search).get("provider")
        if (oauth2Code && oauth2State && oauth2Provider) {
            bindOauth2(oauth2Provider, oauth2State, oauth2Code)
                .catch((error) => {
                    toast.error(error.message)
                })
                .then(() => {
                    getProfile().then((profile) => {
                        setProfile(profile)
                    })
                })
                .finally(() => {
                    window.history.replaceState({}, document.title, window.location.pathname)
                })
        }
    }, [window.location.search])

    const bindO2 = async (provider: string) => {
        try {
            const redirectUrl = await getOauth2RedirectURL(provider, Oauth2RequestType.BIND)
            window.location.href = redirectUrl.redirect!
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const unbindO2 = async (provider: string) => {
        try {
            await unbindOauth2(provider)
            getProfile().then((profile) => {
                setProfile(profile)
            })
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    return (
        profile && (
            <div className={`flex p-8 gap-4 ${isDesktop ? "ml-6" : "flex-col"}`}>
                <div
                    className={`flex ${isDesktop ? "flex-col mr-6" : "gap-4 w-full items-center"}`}
                >
                    <Avatar
                        className={`${isDesktop ? "h-[300px] w-[300px]" : "h-[150px] w-[150px]"} border-foreground border-[1px]`}
                    >
                        <AvatarImage
                            src={
                                "https://api.dicebear.com/7.x/notionists/svg?seed=" +
                                profile.username
                            }
                            alt={profile.username}
                        />
                        <AvatarFallback>{profile.username}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="justify-center text-3xl font-semibold">{profile.username}</p>
                        <p className="text-gray-400">IP: {profile.login_ip || "Unknown"}</p>
                    </div>
                    {isDesktop && (
                        <ProfileCard className="flex mt-4 justify-center items-center max-w-[300px] rounded-lg" />
                    )}
                </div>
                {!isDesktop && (
                    <ProfileCard className="flex justify-center items-center max-w-full rounded-lg" />
                )}
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

                        <Card className="w-full">
                            <CardHeader>
                                <CardTitle className="flex gap-2 text-xl items-center">
                                    <Boxes /> Oauth2 bindings
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-lg font-semibold">
                                {settingData?.config?.oauth2_providers?.map((provider) => (
                                    <div>
                                        {provider}: {profile.oauth2_bind?.[provider.toLowerCase()]}{" "}
                                        {profile.oauth2_bind?.[provider.toLowerCase()] ? (
                                            <Button size="sm" onClick={() => unbindO2(provider)}>
                                                Unbind
                                            </Button>
                                        ) : (
                                            <Button size="sm" onClick={() => bindO2(provider)}>
                                                Bind
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        )
    )
}
