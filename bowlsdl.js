import * as fs from 'fs';

for (let i = 1901; i < 2018; i++) {
  await fetch("https://api.collegefootballdata.com/games?year=" + i + "&seasonType=postseason&division=fbs", {
    headers: {
      'Authorization': 'Bearer yPlsZVl4Kf0qk5zKiT05PuNgwHb/0FNNFkYRWfE8nQvVzsbrNrVLYLBolLYqVUts',
      'Accept': '*/*'
    }
  })
    .then(response => {
      // Handle the response
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
  
    })
    .then(data => {
      // Do something with the data
      fs.writeFile(i +".json", JSON.stringify(data), function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });
    })
    .catch(error => {
      // Handle errors
      console.error('Error:', error);
    });
}

