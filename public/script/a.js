// This script is designed to be used with `dashboard.ejs`.
// It expects a global `chartData` variable to be defined in the HTML before this script is loaded.

function initializeCharts() {
    // Guard clause in case the data isn't passed correctly from the server
    if (typeof chartData === 'undefined' || !chartData) {
        console.error("Chart data is not available. Cannot initialize charts.");
        return;
    }

    // --- Line Chart for Income vs. Expenses ---
    const lineCtx = document.getElementById('myLineChart')?.getContext('2d');
    if (lineCtx && chartData.line && chartData.line.labels.length > 0) {
        new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: chartData.line.labels,
                datasets: [{
                    label: 'Income',
                    data: chartData.line.incomeData,
                    borderColor: 'var(--positive-color)',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Expenses',
                    data: chartData.line.expenseData,
                    borderColor: 'var(--negative-color)',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            // Format Y-axis ticks as currency
                            callback: value => '$' + value
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            // Custom tooltip formatting
                            label: context => {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                    ,
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20
                        }
                    }
                }
            }
        });
    } else if (lineCtx) {
        // If there's no line chart data, display a message.
        const lineChartContainer = document.getElementById('line-chart');
        if (lineChartContainer) {
            lineChartContainer.innerHTML = `
                <h2>Income vs. Expenses</h2>
                <div style="display: flex; align-items: center; justify-content: center; height: 80%; color: var(--light-text);">
                    <p>Not enough data to display trend.</p>
                </div>
            `;
        }
    }

    // --- Pie Chart for Expense Categories ---
    const pieCtx = document.getElementById('myPieChart')?.getContext('2d');
    if (pieCtx && chartData.pie && chartData.pie.labels.length > 0) {
        new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: chartData.pie.labels,
                datasets: [{
                    label: 'Expenses by Category',
                    data: chartData.pie.data,
                    backgroundColor: [
                        '#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8',
                        '#6f42c1', '#fd7e14', '#6c757d', '#20c997', '#e83e8c',
                        '#6610f2', '#d63384', '#0dcaf0', '#ffc107', '#198754'
                    ],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            // Custom tooltip formatting
                            label: context => {
                                let label = context.label || '';
                                if (label) label += ': ';
                                if (context.parsed !== null) {
                                    label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    } else if (pieCtx) {
        // If there's no expense data, display a message instead of an empty chart.
        const pieChartContainer = document.getElementById('pie-chart');
        if (pieChartContainer) {
            pieChartContainer.innerHTML = `
                <h2>Expense Categories</h2>
                <div style="display: flex; align-items: center; justify-content: center; height: 80%; color: var(--light-text);">
                    <p>No expense data to display.</p>
                </div>
            `;
        }
    }
}

// Initialize the charts when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeCharts);
