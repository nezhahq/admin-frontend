"use client"

import { useState } from "react"

import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { IconButton } from "./icon-button"

interface PusherProps {
    property: [string, string]
    setData: React.Dispatch<React.SetStateAction<Record<string, any>>>
}

export const Pusher: React.FC<PusherProps> = ({ property, setData }) => {
    const [cData, setCData] = useState<Record<string, any>>({})

    return (
        <div className="flex flex-col gap-3">
            <div className="flex gap-2 ml-auto">
                <IconButton
                    icon="plus"
                    onClick={() => {
                        const [k, v] = property
                        if (k && v) {
                            const temp = { ...cData }
                            temp[k] = JSON.parse(v)
                            setCData(temp)
                            setData(cData)
                        }
                    }}
                />
                <IconButton
                    icon="minus"
                    variant="destructive"
                    onClick={() => {
                        const [k] = property
                        if (k) {
                            const temp = { ...cData }
                            temp[k] = undefined
                            setCData(temp)
                            setData(cData)
                        }
                    }}
                />
            </div>
            <Label>Preview</Label>
            <Textarea value={JSON.stringify(cData, null, 2)} readOnly />
        </div>
    )
}
