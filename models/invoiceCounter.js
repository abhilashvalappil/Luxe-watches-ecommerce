const mongoose = require('mongoose');

const invoiceCounterSchema = new mongoose.Schema({
    year: { type: Number, required: true },
    count: { type: Number, default: 0 }
});

invoiceCounterSchema.statics.getNextInvoiceNumber = async function(year) {
    const counter = await this.findOneAndUpdate(
        { year },
        { $inc: { count: 1 } },
        { new: true, upsert: true }
    );
    return `LXW/${year}/INV${counter.count.toString().padStart(2, '0')}`;
};

module.exports = mongoose.model('invoiceCounter', invoiceCounterSchema);