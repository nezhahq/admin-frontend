import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import { useNavigate, useRouteError } from "react-router-dom"

interface RouterError {
    statusText?: string
    message?: string
    status?: number
}

export default function ErrorPage() {
    const error = useRouteError() as RouterError
    const navigate = useNavigate()
    console.error(error)

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md shadow-2xl rounded-2xl">
                <CardContent className="pt-6 text-center space-y-4">
                    <div className="flex justify-center">
                        <AlertCircle className="h-12 w-12 text-destructive" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight">Oops!</h1>
                    <p className="text-lg text-muted-foreground/80">
                        Sorry, an unexpected error has occurred.
                    </p>
                    <div className="p-4 bg-muted/70 rounded-lg">
                        <p className="text-sm text-destructive font-semibold italic">
                            {error.statusText || error.message}
                        </p>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-center pb-6">
                    <Button variant="default" size="lg" onClick={() => navigate("/dashboard")}>
                        Back to Dashboard
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
