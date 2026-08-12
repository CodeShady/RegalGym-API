# RegalAPI 👑

## Fetching classes

`POST /api/v1/classes`

You can fetch a list of classes in JSON format with the following payload.

### Payload

```json
{
  "iframe": "https://www-regalgym-com.filesusr.com/html/7db962_695f6d7c92435efb76c3b68b514d4521.html"
}
```

### Returns

```json
{
  "message": "OK",
  "data": [
    {
      "name": "Bugs, 18 months - 3 years",
      "description": "",
      "day": "Tue",
      "startTime": "9:00am",
      "endTime": "9:45am",
      "gender": "All",
      "ages": "1 yr 5 mos - 3 yrs",
      "openings": 0,
      "classStarts": "11/14/2023",
      "classEnds": "",
      "session": "",
      "tuition": 90,
      "status": "waitlist",
      "registerUrl": "https://app.jackrabbitclass.com/reg.asp?id=513088&hc=&initEmpty=&hdrColor=&WL=1&preLoadClassID=17180420&loc="
    },
    ...
  }
]
```
