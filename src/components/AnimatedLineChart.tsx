import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import React from "react";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend
);

interface AnimatedLineChartProps {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    yAxisID?: string;
  }[];
}

const AnimatedLineChart: React.FC<AnimatedLineChartProps> = ({
  labels,
  datasets,
}) => {
  return (
    <div style={{ width: "100%", maxWidth: 700 }}>
      <Line
        data={{ labels, datasets }}
        options={{
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: "Pitch/Sales pr. bruger og Hit Rate (%)",
            },
            legend: {
              display: true,
              position: "top" as const,
            },
          },
          interaction: {
            mode: "nearest",
            axis: "x",
            intersect: false,
          },
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: "Antal" },
            },
            y1: {
              beginAtZero: true,
              position: "right" as const,
              grid: { drawOnChartArea: false },
              title: { display: true, text: "Hit Rate (%)" },
            },
          },
        }}
      />
    </div>
  );
};

export default AnimatedLineChart;
