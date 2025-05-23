"use client"

import { Button } from "@/components/ui/button"
import { useMediaStore } from "@/lib/store"
import { SortingMode } from "@/lib/types"
import { Clock, Flame, Shuffle } from "lucide-react"

export default function SortingControls() {
  const { sortingMode, setSortingMode } = useMediaStore()

  return (
    <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md p-2 rounded-full">
      <Button
        variant={sortingMode === SortingMode.RECENT ? "secondary" : "ghost"}
        size="icon"
        className="rounded-full"
        onClick={() => setSortingMode(SortingMode.RECENT)}
      >
        <Clock className="h-4 w-4" />
        <span className="sr-only">Sort by recency</span>
      </Button>

      <Button
        variant={sortingMode === SortingMode.POPULAR ? "secondary" : "ghost"}
        size="icon"
        className="rounded-full"
        onClick={() => setSortingMode(SortingMode.POPULAR)}
      >
        <Flame className="h-4 w-4" />
        <span className="sr-only">Sort by popularity</span>
      </Button>

      <Button
        variant={sortingMode === SortingMode.RANDOM ? "secondary" : "ghost"}
        size="icon"
        className="rounded-full"
        onClick={() => setSortingMode(SortingMode.RANDOM)}
      >
        <Shuffle className="h-4 w-4" />
        <span className="sr-only">Sort randomly</span>
      </Button>
    </div>
  )
}
