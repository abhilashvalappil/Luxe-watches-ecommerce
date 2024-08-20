
// document.addEventListener('DOMContentLoaded',() => {
//     const form = document.getElementById('register-form');
//     const messageDiv = document.getElementById('message');

//     form.addEventListener('submit',async(event) => {
//         event.preventDefault();

//         messageDiv.innerHTML = '';

//         const formData = new FormData(form);
//         const name = formData.get('name');
//         const email = formData.get('email');
//         const phone = formData.get('phone');
//         const password = formData.get('password');
//         const confirmPassword = formData.get('confirmPassword');

//         let errorMessage = '';
//         if (name.trim() === '') {
//             errorMessage += 'Name is required.<br>';
//         }

//         const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         if (!emailPattern.test(email)) {
//             errorMessage += 'Invalid email address.<br>';
//         }

//         const phonePattern = /^\d{10}$/;
//         if (!phonePattern.test(phone)) {
//             errorMessage += 'Invalid phone number. It should be 10 digits.<br>';
//         }

//         if (password.length < 6) {
//             errorMessage += 'Password must be at least 6 characters long.<br>';
//         }

//         if (password !== repeatPassword) {
//             errorMessage += 'Passwords do not match.<br>';
//         }

//         if (errorMessage) {
//             messageDiv.innerHTML = errorMessage;
//             return;
//         }

//         try {
//             const response = await fetch('/register', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify({
//                     name: name,
//                     email: email,
//                     phone: phone,
//                     password: password,
//                     repeatPassword: repeatPassword
//                 })
//             });

//             const result = await response.json();

//             if (response.ok) {
//                 messageDiv.innerHTML = 'Registration successful!';
//             } else {
//                 messageDiv.innerHTML = result.message || 'Registration failed';
//             }
//         } catch (error) {
//             messageDiv.innerHTML = 'An error occurred: ' + error.message;
//         }


//     })

// })