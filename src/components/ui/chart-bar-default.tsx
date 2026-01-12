"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAppStore } from "@/store/useAppStore"

export const description = "A bar chart"

const chartData = [
  { month: "January", desktop: 186 },
  { month: "February", desktop: 305 },
  { month: "March", desktop: 237 },
  { month: "April", desktop: 73 },
  { month: "May", desktop: 209 },
  { month: "June", desktop: 214 },
]

// Hex colors from src/index.css (converted from oklch)
const THEME_COLORS = {
  light: {
    primary: "#c27435",
    mutedForeground: "#71717a",
    popover: "#ffffff",
    border: "#e4e4e7",
    foreground: "#1c1c22",
  },
  dark: {
    primary: "#e0943a",
    mutedForeground: "#a1a1aa",
    popover: "#27272a",
    border: "#3f3f46",
    foreground: "#d4d4d8",
  },
}

function useChartColors() {
  const { theme: systemTheme } = useAppStore()
  const [colors, setColors] = useState(THEME_COLORS.dark)

  useEffect(() => {
    const updateColors = () => {
      const root = document.documentElement
      const isDark = root.classList.contains("dark")
      const mode = localStorage.getItem("wellbeing-theme")

      // If system mode and theme.json is loaded, use those colors
      if (mode === "system" && systemTheme) {
        setColors({
          primary: systemTheme.colors.primary,
          mutedForeground: systemTheme.colors.textSecondary,
          popover: systemTheme.colors.surface,
          border: systemTheme.colors.secondary,
          foreground: systemTheme.colors.text,
        })
      } else {
        // Use light/dark theme from index.css
        setColors(isDark ? THEME_COLORS.dark : THEME_COLORS.light)
      }
    }

    updateColors()

    // Watch for class changes on html element
    const observer = new MutationObserver(() => updateColors())
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

    // Watch for localStorage changes
    const handleStorage = () => updateColors()
    window.addEventListener("storage", handleStorage)

    return () => {
      observer.disconnect()
      window.removeEventListener("storage", handleStorage)
    }
  }, [systemTheme])

  return colors
}

export function ChartBarDefault() {
  const colors = useChartColors()
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bar Chart</CardTitle>
        <CardDescription>{today}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={colors.border} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
              stroke={colors.mutedForeground}
              fontSize={12}
            />
            <Tooltip
              cursor={false}
              contentStyle={{
                background: colors.popover,
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                color: colors.foreground,
              }}
              labelStyle={{ color: colors.foreground }}
            />
            <Bar dataKey="desktop" fill={colors.primary} radius={8} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
