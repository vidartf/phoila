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

{%- block body_loop -%}

{# from this point on, the kernel is started #}
{%- with kernel_id = kernel_start() -%}

  {{ '{' }} "kernelId": "{{ kernel_id }}" {{ '}' }}

  {#
  Voila is using Jinja's Template.generate method to not render the whole template in one go.
  The current implementation of Jinja will however not yield template snippets if we call a blocks' super()
  Therefore it is important to have the cell loop in the template.
  The issue for Jinja is: https://github.com/pallets/jinja/issues/1044
  #}
  {%- for cell in cell_generator(nb, kernel_id) -%}
    {% set cellloop = loop %}
    {%- block any_cell scoped -%}
      {{ '{' }} "source": {% filter tojson %} {{ super() }} {% endfilter %} {{ '}' }}
    {% endblock any_cell -%}
  {%- endfor -%}
{% endwith %}
{%- endblock body_loop -%}
{% endblock body %}

{% block footer %}
{% endblock footer %}