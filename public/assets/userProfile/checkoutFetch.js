

//******************edit address  */

document.getElementById('update-button').addEventListener('click', async function(event){
    event.preventDefault();

    const selectedOption = document.querySelector('#savedAddress').selectedOptions[0];
    const id = selectedOption.value;

    const name = document.getElementById('editName').value;
    const phone = document.getElementById('editPhone').value;
    const pincode = document.getElementById('editPincode').value;
    const locality = document.getElementById('editLocality').value;
    const address = document.getElementById('editAddress').value;
    const city = document.getElementById('editCity').value;
    const state = document.getElementById('editState').value;
    const landmark = document.getElementById('editLandmark').value;
    const addresstype = document.getElementById('editAddressType').value;
    

    try {
        const response = await fetch('/edit-address',{
            method: 'POST',
            headers:{
                'Content-Type' : 'application/json'
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
                addresstype: addresstype
            })
        })
        const data = await response.json();

        if(data.success){
            Swal.fire({
                icon: 'success',
                title: data.message
            }).then(() => {
                window.location.reload();
            })
        }else{
            Swal.fire({
                icon: 'warning',
                title: data.message
            })
        }
        
    } catch (error) {
        console.log(error)
        Swal.fire({
            icon: 'warning',
            title: data.message
        })
    }
});


//************************add new addres ****************/

document.getElementById('save-btn').addEventListener('click',async function(event){
    event.preventDefault();

    const name = document.getElementById('newName').value;
    const phone = document.getElementById('newPhone').value;
    const pincode = document.getElementById('newPincode').value;
    const locality = document.getElementById('newLocality').value;
    const address = document.getElementById('newAddress').value;
    const city = document.getElementById('newCity').value;
    const state = document.getElementById('newState').value;
    const landmark = document.getElementById('newLandmark').value;
    const addresstype = document.getElementById('newAddressType').value;

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
        const data = await response.json();
        if(data.success){
            Swal.fire({
                icon: 'success',
                title: data.message
            }).then(() => {
                window.location.reload();
            })
        }else{
            Swal.fire({
                icon: 'warning',
                title: data.message
            })
        }
        
    } catch (error) {
        console.log(error)
    }
})

//************************** */

