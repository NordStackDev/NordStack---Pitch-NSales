import React, { useRef, useState } from "react";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData as ChartJSData,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend
);

const CHART_COLORS = {
  red: "#FF6384",
  blue: "#36A2EB",
  green: "#4BC0C0",
  orange: "#FF9F40",
  purple: "#9966FF",
  yellow: "#FFCD56",
};

function transparentize(color: string, opacity: number) {
  const alpha = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0");
  return color + alpha;
}

function months(count: number) {
  const base = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return base.slice(0, count);
}

function numbers({
  count,
  min,
  max,
}: {
  count: number;
  min: number;
  max: number;
}) {
  return Array.from(
    { length: count },
    () => Math.floor(Math.random() * (max - min + 1)) + min
  );
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function namedColor(idx: number) {
  const keys = Object.keys(CHART_COLORS);
  return CHART_COLORS[keys[idx % keys.length] as keyof typeof CHART_COLORS];
}

const DATA_COUNT = 7;
const NUMBER_CFG = { count: DATA_COUNT, min: -100, max: 100 };

const defaultLabels = months(DATA_COUNT);
const defaultData = [
  {
    label: "Dataset 1",
    data: numbers(NUMBER_CFG),
    borderColor: CHART_COLORS.red,
    backgroundColor: transparentize(CHART_COLORS.red, 0.5),
  },
  {
    label: "Dataset 2",
    data: numbers(NUMBER_CFG),
    borderColor: CHART_COLORS.blue,
    backgroundColor: transparentize(CHART_COLORS.blue, 0.5),
  },
];

const InteractiveLineChart: React.FC = () => {
  const [labels, setLabels] = useState<string[]>([...defaultLabels]);
  const [datasets, setDatasets] = useState<any[]>([...defaultData]);
  const chartRef = useRef<any>(null);
  const [progress, setProgress] = useState(0);
  const [initProgress, setInitProgress] = useState(0);

  const actions = [
    {
      name: "Randomize",
      handler: () => {
        setDatasets((prev) =>
          prev.map((ds) => ({
            ...ds,
            data: numbers({ count: labels.length, min: -100, max: 100 }),
          }))
        );
      },
    },
    {
      name: "Add Dataset",
      handler: () => {
        const dsColor = namedColor(datasets.length);
        setDatasets((prev) => [
          ...prev,
          {
            label: `Dataset ${prev.length + 1}`,
            backgroundColor: transparentize(dsColor, 0.5),
            borderColor: dsColor,
            data: numbers({ count: labels.length, min: -100, max: 100 }),
          },
        ]);
      },
    },
    {
      name: "Add Data",
      handler: () => {
        setLabels((prev) => {
          const newLabels = months(prev.length + 1);
          setDatasets((dsPrev) =>
            dsPrev.map((ds) => ({ ...ds, data: [...ds.data, rand(-100, 100)] }))
          );
          return newLabels;
        });
      },
    },
    {
      name: "Remove Dataset",
      handler: () => {
        setDatasets((prev) => prev.slice(0, -1));
      },
    },
    {
      name: "Remove Data",
      handler: () => {
        setLabels((prev) => {
          const newLabels = prev.slice(0, -1);
          setDatasets((dsPrev) =>
            dsPrev.map((ds) => ({ ...ds, data: ds.data.slice(0, -1) }))
          );
          return newLabels;
        });
      },
    },
  ];

  const data: ChartJSData<"line"> = {
    labels,
    datasets,
  };

  const options: ChartOptions<"line"> = {
    animation: {
      duration: 2000,
      onProgress: (context) => {
        if ((context as any).initial) {
          setInitProgress(
            (context as any).currentStep / (context as any).numSteps
          );
        } else {
          setProgress((context as any).currentStep / (context as any).numSteps);
        }
      },
      onComplete: (context) => {
        // Animation complete
      },
    },
    interaction: {
      mode: "nearest",
      axis: "x",
      intersect: false,
    },
    plugins: {
      title: {
        display: true,
        text: "Chart.js Line Chart - Animation Progress Bar",
      },
    },
  };

  return (
    <div>
      <div className="flex gap-2 mb-2 flex-wrap">
        {actions.map((action) => (
          <button
            key={action.name}
            onClick={action.handler}
            className="px-3 py-1 bg-primary text-white rounded hover:bg-primary/80"
            type="button"
          >
            {action.name}
          </button>
        ))}
      </div>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <Line ref={chartRef} data={data} options={options} height={300} />
      </div>
      <div className="mt-2">
        <div>Initial Progress: {(initProgress * 100).toFixed(0)}%</div>
        <div>Animation Progress: {(progress * 100).toFixed(0)}%</div>
      </div>
    </div>
  );
};

export default InteractiveLineChart;
