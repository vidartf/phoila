{%- extends 'lab.tpl' -%}

{%- block output_group -%}
<script type="application/x.voila-lab-output+json">
{{ '{' }}
    {%- if not resources.global_content_filter.include_output_prompt -%}
    "showPrompt": false,
    {%- endif -%}
    "outputs": {{ cell.outputs | tojson }}
{{ '}' }}
</script>
{%- endblock output_group -%}

{%- block header -%}
{%- endblock header -%}

{% block body %}
{{ '{' }} "kernelId": "{{resources.kernel_id}}" {{ '}' }}
{{ '{' }} "source": {% filter tojson %} {{ super() }} {% endfilter %} {{ '}' }}
{% endblock body %}

{% block footer %}
{% endblock footer %}