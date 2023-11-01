const express = require('express');
const axios = require('axios');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const { supabase } = require('./config');

dotenv.config();
const port = process.env.PORT;
app.use(cors());
app.use(bodyParser.json());
/* 
* Return the id, data of the selectors
* {
    id: "id-string", 
    selectors: [
      '.analysis-indicators-list__group:nth-child(1) > div:nth-child(3) > .analysis-indicators-list__item',
      '.analysis-indicators-list__group:nth-child(1) > div:nth-child(6) > .analysis-indicators-list__item',
      '.analysis-indicators-list__group:nth-child(1) > div:nth-child(8) > .analysis-indicators-list__item'
    ]
  }
*/
const generateCSSSelector = (index) => {
  let group = 1;
  if (index < 18) {
    group = 1;
  } else if (index < 37) {
    index = index - 18;
    group = 2;
  } else if (index < 37) {
    index = index - 54;
    group = 3;
  }
  // a lot more to come
  return (
    '.analysis-indicators-list__group:nth-child(' +
    group +
    ') > div:nth-child(' +
    index +
    ') > .analysis-indicators-list__item'
  );
};
app.get('/next', async (req, res) => {
  const { data, error: qError } = await supabase
    .from('tblTask')
    .select()
    .eq('status', 'new')
    .order('created_at', 'asc');
  if (qError) {
    res.status(404).send('Error getting next task');
  }
  if (data.length === 0) {
    res.status(404).send('No task found');
  }
  // take data[0] as the task
  if (data.length > 0) {
    const selectorIndexes = data[0].selectorIndexes;
    const selectors = [];
    selectorIndexes.split(',').forEach((index) => {
      selectors.push(generateCSSSelector(index));
    });
    const task = {
      id: data[0].id,
      selectors,
    };
    const { error } = await supabase
      .from('tblTask')
      .update({ status: 'processing' })
      .eq('id', task.id);
    if (!error) {
      res.send({
        task,
      });
    }
  }
});

app.post('/save', async (req, res) => {
  const { id, selectionUrl } = req.body;
  const { error } = await supabase
    .from('tblTask')
    .update({ selectionUrl, status: 'selectionCreated' })
    .eq('id', id);
  if (error) {
    res.status(404).send('Error saving selection url');
  } else {
    res.send({ ok: true });
  }
});

app.post('/insert', async (req, res) => {
  const { selectorIndexes } = req.body;
  const { error } = await supabase
    .from('tblTask')
    .insert({ selectorIndexes, status: 'new' });
  if (error) {
    res.status(404).send('Error inserting task');
  } else {
    res.send({ ok: true });
  }
});

// Get everything
app.get('/all', async (req, res) => {
  const { data, error } = await supabase.from('tblTask').select();
  if (error) {
    res.status(404).send('Error getting all tasks');
  } else {
    res.send({ data });
  }
});

// Only task with 'processing'
app.get('/processing', async (req, res) => {
  const { data, error } = await supabase
    .from('tblTask')
    .select()
    .eq('status', 'processing');
  if (error) {
    res.status(404).send('Error getting processing tasks');
  } else {
    res.send({ data });
  }
});

// Only task with 'selectionCreated'
app.get('/screated', async (req, res) => {
  const { data, error } = await supabase
    .from('tblTask')
    .select()
    .eq('status', 'selectionCreated');
  if (error) {
    res.status(404).send('Error getting selectionCreated tasks');
  } else {
    res.send({ data });
  }
});

app.post('/reset', async (req, res) => {
  const { id } = req.body;
  const { error } = await supabase
    .from('tblTask')
    .update({ status: 'new' })
    .eq('id', id);
  if (error) {
    res.status(404).send('Error resetting task');
  }
  res.send({ ok: true });
});

app.listen(port, () => {
  console.log(`spark app listening on port ${port}`);
});
