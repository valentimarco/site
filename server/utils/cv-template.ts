export default `{% assign first = true -%}
{
  "sections": [{% if summaryText %}
    {% if first %}{% assign first = false %}{% else %},{% endif %}{ "type": "summary", "title": "Professional Summary", "body": {{ summaryText | json }} }{% endif %}{% if experiences.size > 0 %}
    {% if first %}{% assign first = false %}{% else %},{% endif %}{ "type": "experience", "title": "Professional Experience", "items": [{% for exp in experiences %}{% if forloop.first %}{% else %},{% endif %}
      { "company": {{ exp.company | json }}, "position": {{ exp.position | json }}, "location": {{ exp.location | json }}, "dateRange": {{ exp.dateRange | json }}, "body": {{ exp.body | json }} }{% endfor %}
    ] }{% endif %}{% if skills.size > 0 %}
    {% if first %}{% assign first = false %}{% else %},{% endif %}{ "type": "skills", "title": "Skills", "categories": [{% for cat in skills %}{% if forloop.first %}{% else %},{% endif %}
      { "name": {{ cat.name | json }}, "items": {{ cat.items | json }} }{% endfor %}
    ] }{% endif %}{% if education.size > 0 %}
    {% if first %}{% assign first = false %}{% else %},{% endif %}{ "type": "education", "title": "Education", "items": [{% for edu in education %}{% if forloop.first %}{% else %},{% endif %}
      { "institution": {{ edu.institution | json }}, "degree": {{ edu.degree | json }}, "dateRange": {{ edu.dateRange | json }}, "body": {{ edu.body | json }} }{% endfor %}
    ] }{% endif %}{% if certifications.size > 0 %}
    {% if first %}{% assign first = false %}{% else %},{% endif %}{ "type": "certifications", "title": "Certifications", "items": [{% for cert in certifications %}{% if forloop.first %}{% else %},{% endif %}
      { "title": {{ cert.title | json }}, "issuer": {{ cert.issuer | json }}, "date": {{ cert.date | json }} }{% endfor %}
    ] }{% endif %}{% if contributions.size > 0 %}
    {% if first %}{% assign first = false %}{% else %},{% endif %}{ "type": "contributions", "title": "Open Source Contributions", "items": [{% for contrib in contributions %}{% if forloop.first %}{% else %},{% endif %}
      { "repo": {{ contrib.repoFullName | json }}, "prCount": {{ contrib.prCount | json }}, "stars": {{ contrib.stars | json }} }{% endfor %}
    ] }{% endif %}
  ]
}
`
