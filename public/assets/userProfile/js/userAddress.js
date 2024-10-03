
//******************/ add address

document.getElementById('addAddress-btn').addEventListener('click', async function(event){
event.preventDefault();

const name = document.getElementById('name').value;
const phone = document.getElementById('phone').value;
const pincode = document.getElementById('pincode').value;
const locality = document.getElementById('locality').value;
const address = document.getElementById('address').value;
const city = document.getElementById('city').value;
const state = document.getElementById('state').value;
const landmark = document.getElementById('landmark').value;
const addresstype = document.getElementById('addresstype').value;
 

try {
    const response = await fetch('/add-address',{
        method: 'POST',
        headers:{
            'Content-Type' : 'application/json'
        },
        body: JSON.stringify({
            name: name,
            phone: phone,
            pincode: pincode,
            locality: locality,
            address: address,
            city: city,
            state: state,
            landmark: landmark,
            addresstype: addresstype
        })
    })
    const data = await response.json()

    if(data.success){
        Swal.fire({
            icon: 'success',
            title: data.message
        }).then(() => {
            window.location.href = '/address'
        })
    } else if (data.errors) {
        // Handle validation errors
        let errorMessage = '<ul>';
        for (const [field, message] of Object.entries(data.errors)) {
            errorMessage += `<li>${message}</li>`;
            showError(`${field}-error`, message);
        }
        errorMessage += '</ul>';

        Swal.fire({
            icon: 'error',
            title: 'Validation Error',
            html: errorMessage
        });
    } else {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'An unknown error occurred'
        });
    }
    
} catch (error) {
    Swal.fire({
        icon: 'warning',
        title: 'An error occured',
        text: error.message || 'Please try again later.',
    })
}

});

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function hideError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

// function showError(errorId, message) {
//     let errorElement = document.getElementById(errorId);
//     errorElement.textContent = message;
// }

// function hideError(errorId) {
//     let errorElement = document.getElementById(errorId);
//     errorElement.textContent = '';
// }



///************************** edit

document.querySelectorAll('.update-address-btn').forEach(button => {
    button.addEventListener('click', async function(event) {
        event.preventDefault();

        const addressId = this.id.replace('update-btn', ''); 

        const id = document.getElementById(`edit-address-id${addressId}`).value;
        const name = document.getElementById(`edit-name${addressId}`).value;
        const phone = document.getElementById(`edit-phone${addressId}`).value;
        const pincode = document.getElementById(`edit-pincode${addressId}`).value;
        const locality = document.getElementById(`edit-locality${addressId}`).value;
        const address = document.getElementById(`edit-address${addressId}`).value;
        const city = document.getElementById(`edit-city${addressId}`).value;
        const state = document.getElementById(`edit-state${addressId}`).value;
        const landmark = document.getElementById(`edit-landmark${addressId}`).value;
        const addresstype = document.getElementById(`edit-address-type${addressId}`).value;
        

        try {
            const response = await fetch('/edit-address', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: id,
                    name: name,
                    phone: phone,
                    pincode: pincode,
                    locality: locality,
                    address: address,
                    city: city,
                    state: state,
                    landmark: landmark,
                    addressType: addresstype
                })
            });
            const data = await response.json();
            if(data.success){
                Swal.fire({
                    icon: 'success',
                    title: data.message
                }).then(() => {
                    window.location.reload()
                })
            }else{
                Swal.fire({
                    icon: 'warning',
                    title: data.error || data.message,
                })
            }
        } catch (error) {
           console.log(error);
           Swal.fire({
            icon: 'error',
            title: 'An error occurred while updating the address.'
        });
        }
    });
});


//****************************/ delete

const deleteButtons = document.querySelectorAll('.delete-btn-conform');

deleteButtons.forEach(button => {
    button.addEventListener('click', async function(event){
        event.preventDefault();

        const id = this.getAttribute('data-address-id');

        try {
            const response = await fetch('/delete-address', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ addressId: id })  
            });
            
            const data = await response.json();

            if(data.success){
                Swal.fire({
                    icon: 'success',
                    title: data.message
                }).then(() => {
                    window.location.reload()
                })
            }else{
                Swal.fire({
                    icon: 'warning',
                    title: data.message
                })
            }

        } catch (error) {
            console.log(error);
        }
    });
});

