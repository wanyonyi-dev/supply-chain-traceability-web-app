import React, { useState, useEffect } from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import './Analytics.css';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const AnalyticsDashboard = () => {
    const [transactionData, setTransactionData] = useState([]);
    const [productData, setProductData] = useState([]);
    const [userActivity, setUserActivity] = useState([]);

    useEffect(() => {
        fetchAnalyticsData();
    }, []);

    const fetchAnalyticsData = async () => {
        // Fetch transaction data
        const transactionsRef = collection(db, 'transactions');
        const transactionsSnapshot = await getDocs(transactionsRef);
        const transactions = transactionsSnapshot.docs.map(doc => doc.data());

        // Fetch product data
        const productsRef = collection(db, 'products');
        const productsSnapshot = await getDocs(productsRef);
        const products = productsSnapshot.docs.map(doc => doc.data());

        setTransactionData(transactions);
        setProductData(products);
    };

    const transactionChartData = {
        labels: transactionData.map(t => new Date(t.timestamp).toLocaleDateString()),
        datasets: [{
            label: 'Transaction Volume',
            data: transactionData.map(t => t.amount),
            fill: false,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
        }]
    };

    const productChartData = {
        labels: productData.map(p => p.name),
        datasets: [{
            label: 'Product Distribution',
            data: productData.map(p => p.quantity),
            backgroundColor: [
                'rgba(255, 99, 132, 0.5)',
                'rgba(54, 162, 235, 0.5)',
                'rgba(255, 206, 86, 0.5)',
                'rgba(75, 192, 192, 0.5)',
            ],
            borderWidth: 1
        }]
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Supply Chain Analytics'
            }
        }
    };

    return (
        <div className="analytics-dashboard">
            <div className="chart-container">
                <h3>Transaction Volume</h3>
                <Line data={transactionChartData} options={chartOptions} />
            </div>
            <div className="chart-container">
                <h3>Product Distribution</h3>
                <Pie data={productChartData} options={chartOptions} />
            </div>
            <div className="metrics-grid">
                <div className="metric-card">
                    <h4>Total Transactions</h4>
                    <p>{transactionData.length}</p>
                </div>
                <div className="metric-card">
                    <h4>Total Products</h4>
                    <p>{productData.length}</p>
                </div>
                <div className="metric-card">
                    <h4>Active Users</h4>
                    <p>{userActivity.length}</p>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard; 