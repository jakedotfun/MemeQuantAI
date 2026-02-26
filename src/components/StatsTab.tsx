"use client";

import { Bot, DollarSign, Zap, Gift } from "lucide-react";
import {
  ComposedChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const metrics = [
  { label: "Total Agents Deployed", value: "1,247", icon: Bot },
  { label: "Total Trading Volume", value: "$4.2M", icon: DollarSign },
  { label: "Automations Executed", value: "8,903", icon: Zap },
  { label: "Total Referral Payouts", value: "$12,400", icon: Gift },
];

// --- Mock data generators ---

function generateAutomationsData() {
  const base = [
    3200, 2800, 3500, 4100, 3800, 2200, 800, 1200, 2500, 3900,
    4200, 4500, 3100, 2600, 1800, 600, 900, 1500, 3000, 3700,
    4300, 4100, 3400, 2900, 2100, 700, 500, 1100, 2700, 3600,
    4000, 4400, 3300, 2500, 1600, 800, 1000, 2300, 3200, 3900,
    4500, 4200, 3600, 2800, 1900, 650, 750, 1400, 2900, 3500,
    4100, 4300, 3700, 3000, 2400, 1200, 850, 1800, 3100, 3800,
  ];
  const startDate = new Date(2024, 11, 27);
  return base.map((val, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return {
      date: `${month}/${day < 10 ? "0" + day : day}`,
      value: val,
    };
  });
}

function generateAgentsData() {
  const newAgents = [
    8, 5, 12, 3, 15, 7, 2, 18, 6, 10, 4, 14, 9, 3, 11, 7, 20, 5,
    13, 2, 8, 16, 6, 10, 3, 12, 7, 4, 15, 9, 18, 5, 11, 2, 8, 14,
    6, 3, 17, 10, 7, 13, 4, 9, 19, 5, 12, 3, 8, 15, 6, 11, 2, 14,
    7, 16, 4, 10, 8, 13,
  ];
  let cumulative = 4000;
  const startDate = new Date(2024, 11, 28);
  return newAgents.map((val, i) => {
    cumulative += val;
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return {
      date: `${month}/${day < 10 ? "0" + day : day}`,
      new: val,
      total: cumulative,
    };
  });
}

const automationsData = generateAutomationsData();
const agentsData = generateAgentsData();

const chartTooltipStyle = {
  contentStyle: {
    background: "#16161a",
    border: "1px solid #222228",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#fff",
  },
  itemStyle: { color: "#8B95A9" },
  labelStyle: { color: "#fff", fontWeight: 600, marginBottom: 4 },
};

export default function StatsTab() {
  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <h1 className="text-white font-semibold text-lg">Protocol Stats</h1>

      <div className="grid grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <m.icon size={16} className="text-accent" />
              <p className="text-text-secondary text-xs">{m.label}</p>
            </div>
            <p className="text-2xl font-bold text-white">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Daily Automations */}
      <div className="bg-bg-card rounded-xl border border-border p-5">
        <h2 className="text-white font-semibold text-sm">Daily Automations</h2>
        <p className="text-text-secondary text-xs mt-1 mb-5">Trading strategies executed per day</p>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={automationsData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#222228" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#8B95A9", fontSize: 10 }}
                axisLine={{ stroke: "#222228" }}
                tickLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fill: "#8B95A9", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 6000]}
                tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : String(v))}
              />
              <Tooltip
                {...chartTooltipStyle}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [
                  Number(value).toLocaleString(),
                  "Automations",
                ]}
              />
              <Bar dataKey="value" fill="#2D7EFF" radius={[2, 2, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agents Growth */}
      <div className="bg-bg-card rounded-xl border border-border p-5">
        <h2 className="text-white font-semibold text-sm">Agents Growth</h2>
        <p className="text-text-secondary text-xs mt-1 mb-5">New agents deployed over time</p>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={agentsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222228" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#8B95A9", fontSize: 10 }}
                axisLine={{ stroke: "#222228" }}
                tickLine={false}
                interval={6}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: "#8B95A9", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                scale="log"
                domain={[1, 25]}
                allowDataOverflow
                tickFormatter={(v: number) => String(v)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "#8B95A9", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={[3800, 6200]}
                tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
              />
              <Tooltip
                {...chartTooltipStyle}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [
                  Number(value).toLocaleString(),
                  name === "new" ? "New" : "Total",
                ]}
              />
              <Line
                yAxisId="left"
                dataKey="new"
                stroke="#2D7EFF"
                strokeWidth={2}
                dot={{ r: 2, fill: "#2D7EFF" }}
                activeDot={{ r: 4 }}
                name="new"
              />
              <Line
                yAxisId="right"
                dataKey="total"
                stroke="#5BB8FF"
                strokeWidth={2}
                dot={{ r: 2, fill: "#5BB8FF" }}
                activeDot={{ r: 4 }}
                name="total"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-5 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#2D7EFF]" />
            <span className="text-text-secondary text-xs">New</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#5BB8FF]" />
            <span className="text-text-secondary text-xs">Total</span>
          </div>
        </div>
      </div>
    </div>
  );
}
