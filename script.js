// Initialize IndexedDB
const request = indexedDB.open("IncomeTrackerDB", 1);

request.onupgradeneeded = function(event) {
    const db = event.target.result;
    db.createObjectStore("students", { keyPath: "name" });
    db.createObjectStore("payments", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = function(event) {
    const db = event.target.result;
    addInitialStudents(db);
    loadStudents(db);
    loadPayments(db);
};

// Initial students data
const initialStudents = [
    { name: "", price: "" },
];

// Add initial students to the database
function addInitialStudents(db) {
    const transaction = db.transaction(["students"], "readwrite");
    const store = transaction.objectStore("students");

    initialStudents.forEach(student => {
        store.add(student).onsuccess = function() {
            loadStudents(db);
        };
    });
}

// Add student
document.getElementById('studentForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const name = document.getElementById('studentName').value;
    const price = parseFloat(document.getElementById('lessonPrice').value).toFixed(2);

    const db = request.result;
    const transaction = db.transaction(["students"], "readwrite");
    const store = transaction.objectStore("students");

    store.add({ name, price }).onsuccess = function() {
        loadStudents(db);
    };

    document.getElementById('studentForm').reset();
});

// Add payment
document.getElementById('paymentForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const student = document.getElementById('student').value;
    const date = document.getElementById('date').value;

    const db = request.result;
    const transaction = db.transaction(["students"], "readonly");
    const store = transaction.objectStore("students");

    store.get(student).onsuccess = function(event) {
        const studentData = event.target.result;
        const amount = studentData.price;

        const paymentTransaction = db.transaction(["payments"], "readwrite");
        const paymentStore = paymentTransaction.objectStore("payments");

        paymentStore.add({ student, date, amount }).onsuccess = function() {
            loadPayments(db);
        };
    };

    // Reset only the date field
    document.getElementById('date').value = '';
});

// Set the date input to today's date
function setToday() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
}

// Load students from database
function loadStudents(db) {
    const transaction = db.transaction(["students"], "readonly");
    const store = transaction.objectStore("students");

    store.getAll().onsuccess = function(event) {
        const students = event.target.result;
        const studentsTable = document.getElementById('studentsTable');
        const studentSelect = document.getElementById('student');

        studentsTable.innerHTML = '';
        studentSelect.innerHTML = '';

        students.forEach(student => {
            // Add to table
            const row = studentsTable.insertRow();
            const cell1 = row.insertCell(0);
            const cell2 = row.insertCell(1);
            const cell3 = row.insertCell(2);
            cell2.textContent = student.name;
            cell1.textContent = '₪' + student.price;

            const removeButton = document.createElement('button');
            removeButton.textContent = 'הסרה';
            removeButton.className = 'btn';
            removeButton.onclick = function() {
                removeStudent(student.name);
            };
            cell3.appendChild(removeButton);

            // Add to select
            const option = document.createElement('option');
            option.value = student.name;
            option.textContent = student.name;
            studentSelect.appendChild(option);
        });
    };
}

// Load payments from database
function loadPayments(db) {
    const transaction = db.transaction(["payments"], "readonly");
    const store = transaction.objectStore("payments");

    store.getAll().onsuccess = function(event) {
        const payments = event.target.result;
        const paymentsTable = document.getElementById('paymentsTable');
        const totalIncomeElement = document.getElementById('totalIncome');

        paymentsTable.innerHTML = '';
        let totalIncome = 0;

        const chartData = {
            labels: [],
            values: []
        };

        payments.forEach((payment) => {
            // Add to table
            const row = paymentsTable.insertRow();
            const cell1 = row.insertCell(0);
            const cell2 = row.insertCell(1);
            const cell3 = row.insertCell(2);
            const cell4 = row.insertCell(3);
            const cell5 = row.insertCell(4);
            cell1.textContent = payment.student;
            cell2.textContent = payment.date;
            cell3.textContent = '₪' + payment.amount;

            const removeButton = document.createElement('button');
            removeButton.textContent = 'הסרה';
            removeButton.className = 'btn';
            removeButton.onclick = function() {
                removePayment(payment.id);
            };
            cell4.appendChild(removeButton);

            const printButton = document.createElement('button');
            printButton.textContent = 'הדפס';
            printButton.className = 'btn';
            printButton.onclick = function() {
                printPaymentReceipt(payment.student);
            };
            cell5.appendChild(printButton);

            // Update total income
            totalIncome += parseFloat(payment.amount);

            // Update chart data
            chartData.labels.push(payment.student);
            chartData.values.push(parseFloat(payment.amount));
        });

        totalIncomeElement.textContent = totalIncome.toFixed(2);
        updateChart(chartData);
    };
}

// Remove a student
function removeStudent(studentName) {
    const db = request.result;
    const transaction = db.transaction(["students"], "readwrite");
    const store = transaction.objectStore("students");

    store.delete(studentName).onsuccess = function() {
        loadStudents(db);
    };
}

// Remove a payment
function removePayment(paymentId) {
    const db = request.result;
    const transaction = db.transaction(["payments"], "readwrite");
    const store = transaction.objectStore("payments");

    store.delete(paymentId).onsuccess = function() {
        loadPayments(db);
    };

    store.delete(paymentId).onerror = function(event) {
        console.error("Error removing payment: ", event.target.error);
    };
}

// Clear all payments
document.getElementById('clearAllPayments').addEventListener('click', function() {
    const db = request.result;
    const transaction = db.transaction(["payments"], "readwrite");
    const store = transaction.objectStore("payments");

    store.clear().onsuccess = function() {
        loadPayments(db);
    };
});

// Print payments
document.getElementById('printPayments').addEventListener('click', function() {
    const db = request.result;
    const transaction = db.transaction(["payments"], "readonly");
    const store = transaction.objectStore("payments");

    store.getAll().onsuccess = function(event) {
        const payments = event.target.result;
        let paymentDetails = '';
        let totalAmount = 0;
        const months = new Set();

        payments.forEach(payment => {
            paymentDetails += `
                <tr>
                    <td>${payment.student}</td>
                    <td>${payment.date}</td>
                    <td>${payment.amount}</td>
                </tr>
            `;
            totalAmount += parseFloat(payment.amount);
            const month = new Date(payment.date).toLocaleString('default', { month: 'long' });
            months.add(month);
        });

        const monthNames = Array.from(months).join(' ');
        const filename = `All_Payments_${monthNames}.pdf`;

        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<html><head><title>סיכום שיעורים ' + monthNames + ' </title>');
        printWindow.document.write('<link rel="stylesheet" href="styles.css">');
        printWindow.document.write('</head><body style="font-size: 20px; text-align: right; direction: rtl;">');
        printWindow.document.write('<h2>סיכום שיעורים ' + monthNames + ' </h2>');
        printWindow.document.write('<table><thead><tr><th>שם</th><th>תאריך</th><th>סכום</th></tr></thead><tbody>');
        printWindow.document.write(paymentDetails);
        printWindow.document.write('</tbody></table>');
        printWindow.document.write('<h3>סה"כ: ₪' + totalAmount.toFixed(2) + '</h3>');
        printWindow.document.close();

        printWindow.print();
        printWindow.onafterprint = function() {
            saveAsPDF(printWindow.document, filename);
        };
    };
});

// Print individual payment receipt
function printPaymentReceipt(studentName) {
    const db = request.result;
    const transaction = db.transaction(["payments"], "readonly");
    const store = transaction.objectStore("payments");

    store.getAll().onsuccess = function(event) {
        const payments = event.target.result;
        let paymentDetails = '';
        let totalAmount = 0;
        const months = new Set();

        payments.forEach(payment => {
            if (payment.student === studentName) {
                paymentDetails += `
                    <tr>
                        <td>${payment.student}</td>
                        <td>${payment.date}</td>
                        <td>${payment.amount}</td>
                    </tr>
                `;
                totalAmount += parseFloat(payment.amount);
                const month = new Date(payment.date).toLocaleString('default', { month:'short' });
                months.add(month);
            }
        });

        const monthNames = Array.from(months).join(' ');
        const filename = `${studentName} ${monthNames}.pdf`;

        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<html><head><title> ' + studentName + ' סיכום ' + monthNames + '</title>');
        printWindow.document.write('<link rel="stylesheet" href="styles.css">');
        printWindow.document.write('</head><body style="font-size: 20px; text-align: right; direction: rtl;">');
        printWindow.document.write('<h2>סיכום שיעורים של ' + studentName + '</h2>');
        printWindow.document.write('<table><thead><tr><th>שם</th><th>תאריך</th><th>סכום</th></tr></thead><tbody>');
        printWindow.document.write(paymentDetails);
        printWindow.document.write('</tbody></table>');
        printWindow.document.write('<h3>סה"כ: ₪' + totalAmount.toFixed(2) + '</h3>');
        printWindow.document.close();

        printWindow.print();
        printWindow.onafterprint = function() {
            saveAsPDF(printWindow.document, filename);
        };
    };
}

// Chart.js setup
const ctx = document.getElementById('incomeChart').getContext('2d');
const incomeChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: [],
        datasets: [{
            label: 'Income',
            data: [],
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
        }]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
});

function updateChart(data) {
    incomeChart.data.labels = data.labels;
    incomeChart.data.datasets[0].data = data.values;
    incomeChart.update();
}

// Real-time validation functions
function validateStudentName() {
    const studentName = document.getElementById('studentName').value;
    if (studentName.trim() === '') {
        document.getElementById('studentName').setCustomValidity('יש למלא שם');
    } else {
        document.getElementById('studentName').setCustomValidity('');
    }
}

function validateLessonPrice() {
    const lessonPrice = document.getElementById('lessonPrice').value;
    if (lessonPrice <= 0) {
        document.getElementById('lessonPrice').setCustomValidity('יש למלא תעריף נכון.');
    } else {
        document.getElementById('lessonPrice').setCustomValidity('');
    }
}

// Accordion functionality
const accordions = document.getElementsByClassName("accordion");
for (let i = 0; i < accordions.length; i++) {
    accordions[i].addEventListener("click", function() {
        this.classList.toggle("active");
        const panel = this.nextElementSibling;
        if (panel.style.display === "block") {
            panel.style.display = "none";
        } else {
            panel.style.display = "block";
        }
    });
}

// Helper function to save as PDF
function saveAsPDF(content, filename) {
    html2pdf().from(content.body).set({
        margin: 1,
        filename: filename,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }).save();
}
